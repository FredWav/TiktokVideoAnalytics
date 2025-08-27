// pages/api/analyze.js
import OpenAI from "openai";
import { ScrapingBeeClient } from 'scrapingbee';
import { scrapeTikTokVideo } from "../../lib/scrape";
import { saveVideoAnalysis } from '@/lib/database';

// Helper pour pourcentages
function pct(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function getPerformanceLevel(engagementRate, views) {
  // Correction : Ne jamais "Virale" sous 25k vues
  if (views < 25000) {
    if (engagementRate > 10) return "Prometteur";
    if (engagementRate > 5) return "Très bonne";
    if (engagementRate > 3) return "Bonne";
    if (engagementRate > 1) return "Moyenne";
    return "Faible";
  }
  if (engagementRate > 10) return "Virale";
  if (engagementRate > 5) return "Excellente";
  if (engagementRate > 3) return "Très bonne";
  if (engagementRate > 1) return "Bonne";
  return "Faible";
}

const NICHE_BENCHMARKS = {
  "Humour": { engagement: 8.5, likes: 7.2, comments: 0.8, shares: 0.5 },
  "Danse": { engagement: 9.2, likes: 8.1, comments: 0.6, shares: 0.5 },
  "Beauté/Mode": { engagement: 6.3, likes: 5.2, comments: 0.7, shares: 0.4 },
  "Cuisine": { engagement: 7.1, likes: 6.0, comments: 0.6, shares: 0.5 },
  "Fitness/Sport": { engagement: 5.2, likes: 4.3, comments: 0.5, shares: 0.4 },
  "Éducation": { engagement: 4.8, likes: 3.9, comments: 0.6, shares: 0.3 },
  "Tech": { engagement: 4.5, likes: 3.7, comments: 0.5, shares: 0.3 },
  "Gaming": { engagement: 6.7, likes: 5.6, comments: 0.7, shares: 0.4 },
  "Musique": { engagement: 7.8, likes: 6.7, comments: 0.6, shares: 0.5 },
  "Lifestyle": { engagement: 5.5, likes: 4.6, comments: 0.5, shares: 0.4 }
};

function extractUsername(url) {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : 'unknown';
}

function inferNiche(description, hashtags) {
  const text = `${description || ''} ${hashtags.join(' ')}`.toLowerCase();
  const catalog = [
    { name: 'Fitness/Sport', keys: ['fitness', 'workout', 'musculation', 'gym', 'sport'] },
    { name: 'Humour', keys: ['humour', 'funny', 'drôle', 'comédie', 'blague', 'sketch'] },
    { name: 'Éducation', keys: ['éducation', 'education', 'tuto', 'tutoriel', 'astuce', 'cours'] },
    { name: 'Cuisine', keys: ['cuisine', 'recette', 'cooking', 'food', 'chef'] },
    { name: 'Beauté/Mode', keys: ['beauté', 'beaute', 'makeup', 'maquillage', 'mode', 'fashion'] },
    { name: 'Tech', keys: ['tech', 'technologie', 'hardware', 'logiciel', 'informatique'] },
    { name: 'Gaming', keys: ['gaming', 'game', 'jeu', 'gamer', 'twitch'] },
    { name: 'Musique', keys: ['musique', 'music', 'cover', 'guitare', 'piano', 'rap'] },
    { name: 'Danse', keys: ['danse', 'dance', 'dancing', 'chorégraphie'] }
  ];
  for (const cat of catalog) {
    if (cat.keys.some(k => text.includes(k))) return cat.name;
  }
  return "Lifestyle";
}

// ----- Calculs prédictions dynamiques -----
function computeViralPotential(engagementRate, views, niche) {
  const benchmark = NICHE_BENCHMARKS[niche]?.engagement || 5;
  let score = (engagementRate / benchmark) * 8 + (engagementRate > benchmark ? 2 : 0);
  score = Math.max(1, Math.min(Math.round(score), 10));
  if (views < 25000) score = Math.min(score, 6);
  return score;
}
function computeOptimizedViews(views, engagementRate, niche) {
  if (engagementRate > (NICHE_BENCHMARKS[niche]?.engagement || 5)) {
    const lower = Math.round(views * 1.2 / 1000);
    const upper = Math.round(views * 1.8 / 1000);
    return `${lower}k-${upper}k`;
  }
  const lower = Math.round(views * 0.7 / 1000);
  const upper = Math.round(views * 1.2 / 1000);
  return `${lower}k-${upper}k`;
}
function computeBestPostTime(niche) {
  switch (niche) {
    case "Gaming": return "21h-23h";
    case "Cuisine": return "11h-13h";
    case "Beauté/Mode": return "17h-20h";
    case "Fitness/Sport": return "7h-9h, 18h-20h";
    case "Danse": return "18h-21h";
    case "Tech": return "20h-22h";
    case "Musique": return "19h-22h";
    case "Humour": return "17h-21h";
    default: return "18h-20h";
  }
}
function computeOptimalFrequency(niche) {
  switch (niche) {
    case "Gaming": return "5x/semaine";
    case "Beauté/Mode": return "3x/semaine";
    case "Cuisine": return "2-3x/semaine";
    case "Fitness/Sport": return "4x/semaine";
    case "Tech": return "2x/semaine";
    default: return "3x/semaine";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { url, tier } = req.body || {};
    if (!url) return res.status(400).json({ error: "URL manquante" });

    let data = null;
    let scrapingMethod = "bruteforce";

    // Scraping maison toujours en premier
    try {
      data = await scrapeTikTokVideo(url);
      if (!data.views || data.views === 0) {
        data = null;
      }
    } catch (e) {
      data = null;
    }

    // Si mode Pro ET scraping maison échec, ScrapingBee
    if (!data && tier === 'pro' && process.env.SCRAPINGBEE_API_KEY) {
      scrapingMethod = "scrapingbee";
      try {
        const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
        const response = await client.get({
          url: url,
          params: { 'render_js': true, 'wait': 3000, 'premium_proxy': true }
        });
        const decoder = new TextDecoder();
        const html = decoder.decode(response.data);
        const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/);
        if (sigiMatch) {
          const sigiData = JSON.parse(sigiMatch[1]);
          const itemModule = sigiData?.ItemModule;
          if (itemModule) {
            const itemId = Object.keys(itemModule)[0];
            const item = itemModule[itemId];
            data = {
              url: url,
              views: item?.stats?.playCount || 0,
              likes: item?.stats?.diggCount || 0,
              comments: item?.stats?.commentCount || 0,
              shares: item?.stats?.shareCount || 0,
              saves: item?.stats?.collectCount || 0,
              description: item?.desc || "",
              hashtags: item?.textExtra?.filter(t => t.hashtagName).map(t => `#${t.hashtagName.toLowerCase()}`) || []
            };
          }
        }
      } catch (beeError) {
        // ignore
      }
    }

    if (!data || !data.views) {
      return res.status(500).json({
        error: tier === 'pro'
          ? "Impossible d'extraire les données. Vidéo privée ou structure modifiée."
          : "Extraction échouée. Essayez le mode Pro.",
        scrapingMethod
      });
    }

    // Calculs stats
    const views = data.views || 1;
    const likeRate = views > 0 ? (data.likes / views) * 100 : 0;
    const commentRate = views > 0 ? (data.comments / views) * 100 : 0;
    const shareRate = views > 0 ? (data.shares / views) * 100 : 0;
    const saveRate = views > 0 ? (data.saves / views) * 100 : 0;
    const engagementRate = views > 0 ? ((data.likes + data.comments + data.shares + data.saves) / views) * 100 : 0;

    const username = extractUsername(url);
    const detectedNiche = inferNiche(data.description, data.hashtags);
    const performanceLevel = getPerformanceLevel(engagementRate, views);
    const benchmarks = NICHE_BENCHMARKS[detectedNiche] || NICHE_BENCHMARKS["Lifestyle"];

    let analysis = null;
    let advice = null;
    let predictions = null;

    // ---------- MODE PRO : IA, analyses et prédictions ----------
    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      const viralPotential = computeViralPotential(engagementRate, views, detectedNiche);
      const optimizedViews = computeOptimizedViews(views, engagementRate, detectedNiche);
      const bestPostTime = computeBestPostTime(detectedNiche);
      const optimalFrequency = computeOptimalFrequency(detectedNiche);

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Tu es consultant TikTok expert. Analyse ces données et retourne un JSON structuré et personnalisé.

DONNÉES:
URL: ${url}
Username: @${username}
Vues: ${data.views}
Likes: ${data.likes} (${pct(likeRate)}%)
Commentaires: ${data.comments} (${pct(commentRate)}%)
Partages: ${data.shares} (${pct(shareRate)}%)
Saves: ${data.saves} (${pct(saveRate)}%)
Engagement: ${pct(engagementRate)}%
Performance: ${performanceLevel}
Niche détectée: ${detectedNiche}
Description: ${data.description}
Hashtags: ${data.hashtags.join(" ") || "(aucun)"}
Benchmark pour cette niche: Engagement moyen ${benchmarks.engagement}%

Prédictions calculées à partir des stats :
- Potentiel viral (sur 10): ${viralPotential}
- Vues optimisées: ${optimizedViews}
- Meilleur horaire de post: ${bestPostTime}
- Fréquence optimale: ${optimalFrequency}

Utilise ces valeurs comme base pour le bloc predictions, tu peux les ajuster si tu vois une anomalie dans les stats. Retourne UNIQUEMENT ce JSON:
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
    "viralPotential": ${viralPotential},
    "optimizedViews": "${optimizedViews}",
    "bestPostTime": "${bestPostTime}",
    "optimalFrequency": "${optimalFrequency}"
  }
}`;
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Tu es un expert TikTok. Réponds UNIQUEMENT en JSON valide." },
            { role: "user", content: prompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        });
        const aiResult = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        analysis = aiResult.analysis;
        advice = aiResult.advice;
        predictions = aiResult.predictions;
      } catch (aiError) {
        advice = [{ title: "Erreur IA", details: "L'analyse IA a échoué" }];
      }
    }

    // ---------- MODE BASIQUE : conseils simulés/floutés, pas d'IA ----------
    if (tier === 'free') {
      advice = [
        {
          title: "Conseils complets disponibles en Mode Pro",
          details: "Passez en Mode Pro pour débloquer l'analyse IA et des recommandations personnalisées sur cette vidéo."
        },
        {
          title: "Exemple (flouté)",
          details: "Optimisez votre accroche pour maximiser la rétention. (détail réservé à la version Pro)"
        }
      ];
    }

    const responseData = {
      data: data,
      metrics: {
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
        performanceLevel
      },
      advice,
      thumbnail: null,
      description: data.description,
      hashtags: data.hashtags,
      niche: detectedNiche,
      username: username,
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
        saveRate
      },
      benchmarks: benchmarks,
      analysis,
      predictions,
      tier: tier || 'free',
      scrapingMethod
    };

    // Sauvegarde DB si Pro
    if (tier === 'pro') {
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
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        // ignore
      }
    }

    return res.status(200).json(responseData);

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Erreur serveur",
      debug: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
}
