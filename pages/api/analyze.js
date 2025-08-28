// pages/api/analyze.js
import OpenAI from "openai";
import { ScrapingBeeClient } from "scrapingbee";
import { scrapeTikTokVideo } from "../../lib/scrape";
import { saveVideoAnalysis } from "@/lib/database";
import { config, validateRuntime } from "@/lib/config";

// --- Utils existants conservés ---
function getPerformanceLevel(engagementRate) {
  if (engagementRate > 10) return "Virale";
  if (engagementRate > 5) return "Excellente";
  if (engagementRate > 3) return "Très bonne";
  if (engagementRate > 1) return "Bonne";
  if (engagementRate > 0.5) return "Moyenne";
  return "Faible";
}

const NICHE_BENCHMARKS = {
  Humour: { engagement: 8.5, likes: 7.2, comments: 0.8, shares: 0.5 },
  Danse: { engagement: 9.2, likes: 8.1, comments: 0.6, shares: 0.5 },
  "Beauté/Mode": { engagement: 6.3, likes: 5.2, comments: 0.7, shares: 0.4 },
  Cuisine: { engagement: 7.1, likes: 6.0, comments: 0.6, shares: 0.5 },
  "Fitness/Sport": { engagement: 5.2, likes: 4.3, comments: 0.5, shares: 0.4 },
  Éducation: { engagement: 4.8, likes: 3.9, comments: 0.6, shares: 0.3 },
  Tech: { engagement: 4.5, likes: 3.7, comments: 0.5, shares: 0.3 },
  Gaming: { engagement: 6.7, likes: 5.6, comments: 0.7, shares: 0.4 },
  Musique: { engagement: 7.8, likes: 6.7, comments: 0.6, shares: 0.5 },
  Lifestyle: { engagement: 5.5, likes: 4.6, comments: 0.5, shares: 0.4 },
};

function extractUsername(url) {
  const match = String(url || "").match(/@([^/]+)/);
  return match ? match[1] : "unknown";
}

function inferNiche(description, hashtags = []) {
  const text = `${description || ""} ${hashtags.join(" ")}`.toLowerCase();
  const catalog = [
    {
      name: "Fitness/Sport",
      keys: ["fitness", "workout", "musculation", "gym", "sport"],
    },
    { name: "Humour", keys: ["humour", "funny", "drôle", "comédie", "blague", "sketch"] },
    { name: "Éducation", keys: ["éducation", "education", "tuto", "tutoriel", "astuce", "cours"] },
    { name: "Cuisine", keys: ["cuisine", "recette", "cooking", "food", "chef"] },
    { name: "Beauté/Mode", keys: ["beauté", "beaute", "makeup", "maquillage", "mode", "fashion"] },
    { name: "Tech", keys: ["tech", "technologie", "hardware", "logiciel", "informatique"] },
    { name: "Gaming", keys: ["gaming", "game", "jeu", "gamer", "twitch"] },
    { name: "Musique", keys: ["musique", "music", "cover", "guitare", "piano", "rap"] },
    { name: "Danse", keys: ["danse", "dance", "dancing", "chorégraphie"] },
  ];
  for (const cat of catalog) {
    if (cat.keys.some((k) => text.includes(k))) return cat.name;
  }
  return "Lifestyle";
}

// --- Conseils heuristiques (FREE, sans OpenAI) ---
function buildHeuristicAdvice({
  engagementRate,
  likeRate,
  commentRate,
  shareRate,
  saveRate,
  desc,
  hashtags,
}) {
  const bullets = [];

  if (engagementRate < 1) {
    bullets.push(
      "Le hook n’a probablement pas retenu. Revois les 3 premières secondes (problème → promesse → angle fort)."
    );
  }
  if (likeRate < 3) {
    bullets.push(
      "Le ratio likes/vues est bas : simplifie la promesse et montre le bénéfice visuel plus tôt."
    );
  }
  if (commentRate < 0.3) {
    bullets.push(
      "Peu de commentaires : pose une question précise en fin de vidéo et retire les questions trop génériques."
    );
  }
  if (shareRate < 0.2) {
    bullets.push(
      "Partages faibles : ajoute un 'moment à montrer à un pote' (révélation, avant/après, tip rapide)."
    );
  }
  if (saveRate < 0.2) {
    bullets.push(
      "Peu d’enregistrements : ajoute un visuel récap (3 points clés) dans la dernière seconde pour inciter au save."
    );
  }

  if (!hashtags || hashtags.length < 3) {
    bullets.push("Ajoute 3–5 hashtags spécifiques à ta sous-niche, évite les #génériques.");
  }

  if (!desc || desc.length < 20) {
    bullets.push("Allonge un peu la description (1 phrase utile + 1 promesse) pour le contexte SEO.");
  }

  return (
    "Recos rapides :\n" +
    bullets.map((b, i) => `- ${b}`).join("\n")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { url, tier } = req.body || {};
    const tierMode = tier === "pro" ? "pro" : "free";
    if (!url) return res.status(400).json({ error: "URL manquante" });

    // Log les warnings manquants si pro (sans bloquer)
    validateRuntime({ pro: tierMode === "pro" });

    console.warn("Début scraping pour:", url, "Tier:", tierMode);

    let data = null;
    let scrapingMethod = "bruteforce";

    // 1) Scraping maison d'abord
    try {
      data = await scrapeTikTokVideo(url);
      console.warn("Données scrapées (maison):", JSON.stringify(data, null, 2));
      if (!data?.views || data.views === 0) {
        console.warn("Bruteforce a retourné 0 vues → on invalide");
        data = null;
      }
    } catch (e) {
      console.error("Erreur bruteforce:", e?.message || e);
      data = null;
    }

    // 2) Fallback ScrapingBee uniquement si PRO
    if (!data && tierMode === "pro" && config.keys.scrapingBee) {
      console.warn("Tentative avec ScrapingBee (mode Pro)...");
      scrapingMethod = "scrapingbee";

      try {
        const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
        const response = await client.get({
          url: url,
          params: {
            // On reste fidèle à ta conf opérationnelle
            render_js: true,
            wait: 3000,
            premium_proxy: true,
          },
        });

        const decoder = new TextDecoder();
        const html = decoder.decode(response.data);

        // Parsing du SIGI_STATE
        const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/);
        if (sigiMatch) {
          const sigiData = JSON.parse(sigiMatch[1]);
          const itemModule = sigiData?.ItemModule;
          if (itemModule) {
            const itemId = Object.keys(itemModule)[0];
            const item = itemModule[itemId];

            const tags =
              item?.textExtra?.filter((t) => t.hashtagName)?.map((t) => `#${t.hashtagName.toLowerCase()}`) || [];

            data = {
              url,
              views: item?.stats?.playCount || 0,
              likes: item?.stats?.diggCount || 0,
              comments: item?.stats?.commentCount || 0,
              shares: item?.stats?.shareCount || 0,
              saves: item?.stats?.collectCount || 0,
              description: item?.desc || "",
              hashtags: tags,
            };
          }
        }
      } catch (beeError) {
        console.error("Erreur ScrapingBee:", beeError);
      }
    }

    // 3) Toujours rien → erreur contextualisée
    if (!data || !data.views) {
      return res.status(500).json({
        error:
          tierMode === "pro"
            ? "Impossible d'extraire les données. Vidéo privée ou structure modifiée."
            : "Extraction échouée. Passez en mode Pro pour un fallback avancé.",
        scrapingMethod,
      });
    }

    // 4) Métriques dérivées
    const totalInteractions =
      (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0);
    const views = Math.max(1, data.views || 1);

    const engagementRate = (totalInteractions / views) * 100;
    const likeRate = (data.likes / views) * 100 || 0;
    const commentRate = (data.comments / views) * 100 || 0;
    const shareRate = (data.shares / views) * 100 || 0;
    const saveRate = (data.saves / views) * 100 || 0;

    const username = extractUsername(url);
    const detectedNiche = inferNiche(data.description, data.hashtags || []);
    const performanceLevel = getPerformanceLevel(engagementRate);
    const benchmarks = NICHE_BENCHMARKS[detectedNiche] || NICHE_BENCHMARKS["Lifestyle"];

    // 5) Analyse IA (uniquement PRO) OU conseils heuristiques (FREE)
    let analysis = null;
    let advice = "";
    let predictions = null;

    if (tierMode === "pro" && config.ai.enabled && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Tu es consultant TikTok expert. Analyse ces données et retourne un JSON structuré.

DONNÉES:
URL: ${url}
Username: @${username}
Vues: ${data.views}
Likes: ${data.likes} (${likeRate.toFixed(1)}%)
Commentaires: ${data.comments} (${commentRate.toFixed(1)}%)
Partages: ${data.shares} (${shareRate.toFixed(1)}%)
Saves: ${data.saves} (${saveRate.toFixed(1)}%)
Engagement: ${engagementRate.toFixed(1)}%
Performance: ${performanceLevel}
Niche détectée: ${detectedNiche}
Description: ${data.description}
Hashtags: ${Array.isArray(data.hashtags) ? data.hashtags.join(" ") : "(aucun)"}

Benchmark ${detectedNiche}: Engagement moyen ${benchmarks.engagement}%

Retourne UNIQUEMENT ce JSON:
{
  "analysis": {
    "niche": "${detectedNiche}",
    "subNiche": "sous-catégorie précise",
    "contentType": "type de contenu",
    "viralFactors": ["facteur 1", "facteur 2", "facteur 3"],
    "weakPoints": ["point faible 1", "point faible 2"],
    "audienceProfile": {
      "ageRange": "18-24 ans",
      "primaryGender": "estimation",
      "interests": ["intérêt 1", "intérêt 2"]
    },
    "contentQuality": {
      "hookScore": 7,
      "retentionScore": 6,
      "ctaScore": 5
    },
    "hashtagAnalysis": {
      "effectiveness": 7,
      "missing": ["#hashtag1", "#hashtag2"],
      "trending": true
    }
  },
  "advice": [
    {"title": "Conseil 1", "details": "Détails du conseil"},
    {"title": "Conseil 2", "details": "Détails du conseil"},
    {"title": "Conseil 3", "details": "Détails du conseil"},
    {"title": "Conseil 4", "details": "Détails du conseil"},
    {"title": "Conseil 5", "details": "Détails du conseil"},
    {"title": "Conseil 6", "details": "Détails du conseil"}
  ],
  "predictions": {
    "viralPotential": 7,
    "optimizedViews": "100k-200k",
    "bestPostTime": "18h-20h",
    "optimalFrequency": "3x/semaine"
  }
}`;

      console.warn("Appel OpenAI (Pro)...");
      try {
        const completion = await client.chat.completions.create({
          model: config.ai.model || "gpt-4.1",
          messages: [
            { role: "system", content: "Tu es un expert TikTok. Réponds UNIQUEMENT en JSON valide." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        });

        const aiJSON = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        analysis = aiJSON.analysis || null;
        advice = aiJSON.advice || [];
        predictions = aiJSON.predictions || null;
      } catch (aiError) {
        console.error("Erreur IA:", aiError);
        advice = [{ title: "Erreur IA", details: "L'analyse IA a échoué" }];
      }
    } else {
      // FREE : pas d'OpenAI → conseils heuristiques en texte (compat backward)
      advice = buildHeuristicAdvice({
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
        desc: data.description,
        hashtags: data.hashtags,
      });
      predictions = null;
      analysis = null;
    }

    // 6) Réponse (compat avec ton front)
    const responseData = {
      data,
      metrics: {
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
        performanceLevel,
      },
      advice, // string (FREE) ou array (PRO)
      thumbnail: null, // TODO: extraire si possible
      description: data.description,
      hashtags: data.hashtags,
      niche: detectedNiche,
      username,
      stats: {
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        saves: data.saves,
        duration: 0,
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
      },
      benchmarks,
      analysis, // null en FREE
      predictions, // null en FREE
      tier: tierMode,
      scrapingMethod,
    };

    // 7) Sauvegarde DB seulement en PRO
    if (tierMode === "pro") {
      try {
        await saveVideoAnalysis({
          url,
          username,
          niche: detectedNiche,
          stats: responseData.stats,
          metrics: responseData.metrics,
          description: data.description,
          hashtags: data.hashtags,
          analysis: analysis,
          timestamp: new Date().toISOString(),
        });
        console.warn("Analyse sauvegardée en DB");
      } catch (dbError) {
        console.error("Erreur sauvegarde DB:", dbError);
      }
    }

    return res.status(200).json(responseData);
  } catch (e) {
    console.error("Erreur complète:", e);
    return res.status(500).json({
      error: e.message || "Erreur serveur",
      debug: process.env.NODE_ENV === "development" ? e.stack : undefined,
    });
  }
}
