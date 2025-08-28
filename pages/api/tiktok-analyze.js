// pages/api/analyze-account.js
import OpenAI from "openai";
import { ScrapingBeeClient } from "scrapingbee";
import { saveVideoAnalysis } from "@/lib/database";
import { config, validateRuntime } from "@/lib/config";

// ---------- Benchmarks & helpers communs ----------
const NICHE_BENCHMARKS = {
  Humour: { engagement: 8.5 },
  Danse: { engagement: 9.2 },
  "Beauté/Mode": { engagement: 6.3 },
  Cuisine: { engagement: 7.1 },
  "Fitness/Sport": { engagement: 5.2 },
  Éducation: { engagement: 4.8 },
  Tech: { engagement: 4.5 },
  Gaming: { engagement: 6.7 },
  Musique: { engagement: 7.8 },
  Lifestyle: { engagement: 5.5 },
};

function getPerformanceLevel(er) {
  if (er > 10) return "Virale";
  if (er > 5) return "Excellente";
  if (er > 3) return "Très bonne";
  if (er > 1) return "Bonne";
  if (er > 0.5) return "Moyenne";
  return "Faible";
}

function inferNicheFromText(text = "") {
  const s = String(text || "").toLowerCase();
  const cats = [
    { name: "Fitness/Sport", keys: ["fitness", "workout", "musculation", "gym", "sport"] },
    { name: "Humour", keys: ["humour", "funny", "drôle", "comédie", "blague", "sketch"] },
    { name: "Éducation", keys: ["éducation", "education", "tuto", "tutoriel", "astuce", "cours"] },
    { name: "Cuisine", keys: ["cuisine", "recette", "cooking", "food", "chef"] },
    { name: "Beauté/Mode", keys: ["beauté", "beaute", "makeup", "maquillage", "mode", "fashion"] },
    { name: "Tech", keys: ["tech", "technologie", "hardware", "logiciel", "informatique"] },
    { name: "Gaming", keys: ["gaming", "game", "jeu", "gamer", "twitch"] },
    { name: "Musique", keys: ["musique", "music", "cover", "guitare", "piano", "rap"] },
    { name: "Danse", keys: ["danse", "dance", "dancing", "chorégraphie"] },
  ];
  for (const c of cats) if (c.keys.some(k => s.includes(k))) return c.name;
  return "Lifestyle";
}

function extractUsername(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/@([A-Za-z0-9._-]{2,32})/);
  if (m) return m[1];
  const cleaned = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (cleaned.startsWith("tiktok.com/@")) {
    const part = cleaned.split("/")[1] || "";
    return part.replace(/^@/, "");
  }
  return s.replace(/^@/, "");
}

// ---------- Scraping (maison puis Bee en pro) ----------
const UA = config.scraping.headers;

async function fetchDirect(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.scraping.timeoutMs);
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow", signal: ctrl.signal });
    if (!r.ok) throw new Error(`Direct fetch failed: ${r.status} ${r.statusText}`);
    const html = await r.text();
    if (!html || html.length < 1000) throw new Error("Direct fetch returned too little HTML.");
    return html;
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithBee(url) {
  const key = process.env.SCRAPINGBEE_API_KEY;
  if (!key) throw new Error("SCRAPINGBEE_API_KEY manquante.");
  const client = new ScrapingBeeClient(key);
  const resp = await client.get({
    url,
    params: {
      render_js: false,          // inutile d’exécuter tout le JS pour SIGI_STATE
      block_resources: true,
      wait: 0,
      premium_proxy: true,
      country_code: config.scraping.countryCode || "fr",
    },
  });
  const decoder = new TextDecoder();
  const html = decoder.decode(resp.data);
  if (!html || html.length < 1000) throw new Error("ScrapingBee returned too little HTML.");
  return html;
}

function parseSIGI(html) {
  const m =
    html.match(/<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/i) ||
    html.match(/window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?})\s*;<\/script>/i);
  if (!m || !m[1]) throw new Error("SIGI_STATE introuvable.");
  const raw = m[1].trim();
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/<\/?script>/gi, "");
    return JSON.parse(cleaned);
  }
}

function extractAccount(sigi) {
  const users = sigi?.UserModule?.users || {};
  const stats = sigi?.UserModule?.stats || {};
  const uniqueId = Object.keys(users)[0];
  const user = users[uniqueId] || null;
  const userStats = uniqueId ? stats[uniqueId] : null;

  const itemModule = sigi?.ItemModule || {};
  const videos = Object.values(itemModule).map((v) => ({
    id: v?.id || null,
    desc: v?.desc || "",
    stats: {
      playCount: Number(v?.stats?.playCount ?? 0),
      diggCount: Number(v?.stats?.diggCount ?? 0),
      shareCount: Number(v?.stats?.shareCount ?? 0),
      commentCount: Number(v?.stats?.commentCount ?? 0),
      collectCount: Number(v?.stats?.collectCount ?? 0),
    },
    createTime: v?.createTime ? Number(v.createTime) : null,
    hashtags: Array.isArray(v?.textExtra)
      ? v.textExtra.filter(t => t?.hashtagName).map(t => `#${t.hashtagName.toLowerCase()}`)
      : [],
  }));

  return {
    user: {
      uniqueId: user?.uniqueId || uniqueId || null,
      nickname: user?.nickname || null,
      bio: user?.signature || null,
    },
    stats: {
      followerCount: Number(userStats?.followerCount ?? 0),
      followingCount: Number(userStats?.followingCount ?? 0),
      likeCount: Number(userStats?.heart ?? 0),
      videoCount: Number(userStats?.videoCount ?? videos.length || 0),
    },
    videos,
  };
}

// ---------- Dérivés ----------
function deriveFromVideos(videos = [], limit = 20) {
  const sample = [...videos]
    .filter(v => typeof v?.stats?.playCount === "number")
    .sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
    .slice(0, limit);

  const sums = sample.reduce(
    (acc, v) => {
      const s = v.stats || {};
      acc.views += s.playCount || 0;
      const inter = (s.diggCount || 0) + (s.commentCount || 0) + (s.shareCount || 0) + (s.collectCount || 0);
      acc.interactions += inter;
      acc.count += 1;
      if (v.createTime) acc.times.push(v.createTime);
      acc.hashtags.push(...(v.hashtags || []));
      return acc;
    },
    { views: 0, interactions: 0, count: 0, times: [], hashtags: [] }
  );

  const avgViews = sums.count ? sums.views / sums.count : 0;
  const avgER = sums.views ? (sums.interactions / sums.views) * 100 : 0;

  // posts / semaine
  let postsPerWeek = null;
  if (sums.times.length >= 2) {
    const maxT = Math.max(...sums.times);
    const minT = Math.min(...sums.times);
    const days = Math.max(1, (maxT - minT) / (60 * 60 * 24));
    postsPerWeek = (sums.count / days) * 7;
  }

  // diversité hashtags
  const uniqueHashtags = Array.from(new Set(sums.hashtags.map((h) => h.toLowerCase())));

  return {
    sampleCount: sums.count,
    avgViews,
    avgEngagementRate: avgER,
    postsPerWeek,
    uniqueHashtagsCount: uniqueHashtags.length,
    topHashtags: uniqueHashtags.slice(0, 10),
  };
}

function buildHeuristicAdviceAccount({ ratio, avgER, postsPerWeek, niche, uniqueHashtagsCount }) {
  const tips = [];
  if (ratio !== null && ratio < 1) {
    tips.push("Le ratio abonnés/suivis est faible : nettoie tes follows et renforce l’autorité de niche.");
  }
  const bench = (NICHE_BENCHMARKS[niche] || NICHE_BENCHMARKS["Lifestyle"]).engagement;
  if (avgER < bench * 0.6) {
    tips.push(
      `Engagement moyen inférieur à la niche (${avgER.toFixed(1)}% < ${bench}%). Renforce le hook et clarifie la promesse par contenu.`
    );
  }
  if (!postsPerWeek || postsPerWeek < 2) {
    tips.push("Fréquence basse : vise 3 à 5 posts/semaine pour créer des signaux réguliers.");
  }
  if (uniqueHashtagsCount < 5) {
    tips.push("Hashtags trop génériques/faibles : cible 5–10 hashtags de sous-niche réellement recherchés.");
  }
  if (!tips.length) tips.push("Bon cap : garde le rythme et commence un A/B sur hooks (3 variantes).");
  return tips;
}

// ---------- Handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { input, tier } = req.body || {};
    const tierMode = tier === "pro" ? "pro" : "free";
    const username = extractUsername(input);

    if (!username || !/^[A-Za-z0-9._-]{2,32}$/.test(username)) {
      return res.status(400).json({ error: "Username invalide. Exemple valide : @fredwav" });
    }

    // Log les warnings (clés manquantes) sans bloquer
    validateRuntime({ pro: tierMode === "pro" });

    const profileUrl = `https://www.tiktok.com/@${username}`;
    let html = null;
    let scrapingMethod = "bruteforce";

    // 1) Scraping maison
    try {
      html = await fetchDirect(profileUrl);
    } catch (e1) {
      html = null;
      console.warn("Direct scraping KO:", e1?.message || e1);
    }

    // 2) Fallback ScrapingBee (PRO uniquement)
    if (!html && tierMode === "pro" && config.keys.scrapingBee) {
      try {
        scrapingMethod = "scrapingbee";
        html = await fetchWithBee(profileUrl);
      } catch (e2) {
        console.error("ScrapingBee KO:", e2?.message || e2);
      }
    }

    if (!html) {
      return res.status(500).json({
        error:
          tierMode === "pro"
            ? "Impossible d'extraire le profil (privé/changé)."
            : "Extraction échouée. Passe en mode Pro pour un fallback avancé.",
        scrapingMethod,
      });
    }

    // 3) Parsing & dérivés
    const sigi = parseSIGI(html);
    const parsed = extractAccount(sigi);

    const f = Number(parsed?.stats?.followerCount ?? 0);
    const g = Number(parsed?.stats?.followingCount ?? 0);
    const ratio = g > 0 ? f / g : null;

    const derived = deriveFromVideos(parsed?.videos || [], 20);

    // Détection de niche (bio + descriptions)
    const textForNiche =
      (parsed?.user?.bio || "") +
      " " +
      (parsed?.videos || []).map(v => `${v.desc} ${(v.hashtags || []).join(" ")}`).join(" ");
    const niche = inferNicheFromText(textForNiche);
    const bench = NICHE_BENCHMARKS[niche] || NICHE_BENCHMARKS["Lifestyle"];

    const perfLevel = getPerformanceLevel(derived.avgEngagementRate || 0);

    // 4) IA (PRO) ou heuristique (FREE)
    let ai = null;
    let advice = null;

    if (tierMode === "pro" && config.ai.enabled && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Tu es consultant TikTok expert. Analyse un COMPTE à partir des données ci-dessous et retourne un JSON.
Compte: @${parsed?.user?.uniqueId || username}
Bio: ${parsed?.user?.bio || "(vide)"}
Followers: ${f}
Following: ${g}
Ratio F/F: ${ratio !== null ? ratio.toFixed(2) : "NA"}
Vidéos échantillon: ${derived.sampleCount}
Vues moyennes (échant.): ${Math.round(derived.avgViews)}
Engagement moyen (échant.): ${derived.avgEngagementRate.toFixed(1)}%
Posts/semaine (estim.): ${derived.postsPerWeek ? derived.postsPerWeek.toFixed(1) : "NA"}
Niche détectée: ${niche}
Benchmark niche (ER): ${bench.engagement}%

Retourne UNIQUEMENT ce JSON:
{
  "analysis": {
    "positioning": "positionnement clair",
    "contentPillars": ["pilier 1", "pilier 2", "pilier 3"],
    "hookPatterns": ["pattern 1", "pattern 2"],
    "editingPatterns": ["cut rapide", "sous-titres", "emoji"],
    "growthLevers": ["levier 1", "levier 2"]
  },
  "advice": [
    {"title": "Conseil prioritaire 1", "details": "détail"},
    {"title": "Conseil 2", "details": "détail"},
    {"title": "Conseil 3", "details": "détail"},
    {"title": "Conseil 4", "details": "détail"},
    {"title": "Conseil 5", "details": "détail"}
  ],
  "predictions": {
    "targetER": "${(bench.engagement * 1.1).toFixed(1)}%",
    "targetPostsPerWeek": "3-5",
    "milestones90d": ["objectif 1", "objectif 2"]
  }
}`;

      try {
        const completion = await client.chat.completions.create({
          model: config.ai.model || "gpt-4.1",
          messages: [
            { role: "system", content: "Tu es un expert TikTok. Réponds UNIQUEMENT en JSON valide." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
        const obj = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        ai = obj;
        advice = obj?.advice || null;
      } catch (e) {
        console.error("Erreur IA:", e);
        advice = [{ title: "Erreur IA", details: "Analyse IA indisponible" }];
      }
    } else {
      // FREE → recommandations heuristiques
      advice = buildHeuristicAdviceAccount({
        ratio,
        avgER: derived.avgEngagementRate || 0,
        postsPerWeek: derived.postsPerWeek || 0,
        niche,
        uniqueHashtagsCount: derived.uniqueHashtagsCount || 0,
      });
    }

    // 5) Réponse structurée + sauvegarde DB (PRO)
    const result = {
      mode: tierMode,
      username: parsed?.user?.uniqueId || username,
      profile: {
        nickname: parsed?.user?.nickname || null,
        bio: parsed?.user?.bio || null,
      },
      stats: {
        followers: f,
        following: g,
        likesTotal: Number(parsed?.stats?.likeCount ?? 0),
        videosCount: Number(parsed?.stats?.videoCount ?? 0),
        followerToFollowingRatio: ratio,
      },
      sample: {
        count: derived.sampleCount,
        avgViews: Math.round(derived.avgViews),
        avgEngagementRate: Number(derived.avgEngagementRate.toFixed(2)),
        postsPerWeek: derived.postsPerWeek ? Number(derived.postsPerWeek.toFixed(2)) : null,
        topHashtags: derived.topHashtags,
        performanceLevel: perfLevel,
      },
      niche,
      benchmarks: bench,
      recentVideos: parsed?.videos || [],
      aiReport: ai || null,      // struct JSON en PRO, null en FREE
      advice,                    // array en PRO, string[] heuristiques en FREE
      scrapingMethod,
      generatedAt: new Date().toISOString(),
    };

    if (tierMode === "pro") {
      try {
        await saveVideoAnalysis({
          type: "account",
          username: result.username,
          niche: result.niche,
          metrics: {
            followers: result.stats.followers,
            following: result.stats.following,
            likesTotal: result.stats.likesTotal,
            videosCount: result.stats.videosCount,
            avgEngagementRate: result.sample.avgEngagementRate,
            postsPerWeek: result.sample.postsPerWeek,
          },
          source: "analyze-account",
          raw: result,
          createdAt: result.generatedAt,
        });
        console.warn("Analyse de compte sauvegardée en DB");
      } catch (dbErr) {
        console.error("Erreur sauvegarde DB:", dbErr);
      }
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("[analyze-account] failure:", e);
    return res.status(500).json({
      error: e.message || "Erreur serveur",
      debug: process.env.NODE_ENV === "development" ? e.stack : undefined,
    });
  }
}
