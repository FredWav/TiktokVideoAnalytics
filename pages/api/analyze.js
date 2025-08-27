// pages/api/analyze.js
import OpenAI from "openai";
import { ScrapingBeeClient } from 'scrapingbee';
import { scrapeTikTokVideo } from "../../lib/scrape";
import { saveVideoAnalysis } from '@/lib/database';

function pct(n) {
  return Number.isFinite(n) ? Math.round(n * 10000) / 100 : 0;
}

function getPerformanceLevel(engagementRate) {
  if (engagementRate > 10) return "Virale";
  if (engagementRate > 5) return "Excellente";
  if (engagementRate > 3) return "Très bonne";
  if (engagementRate > 1) return "Bonne";
  if (engagementRate > 0.5) return "Moyenne";
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

// ----------- AJOUT CALCULS PRÉDICTIONS -----------

// Calcule le potentiel viral sur 10
function computeViralPotential(engagementRate, niche) {
  const benchmark = NICHE_BENCHMARKS[niche]?.engagement || 5;
  let score = (engagementRate / benchmark) * 8 + (engagementRate > benchmark ? 2 : 0); // sur 10
  score = Math.max(1, Math.min(Math.round(score), 10));
  return score;
}

// Calcule la fourchette de vues optimisées
function computeOptimizedViews(views, engagementRate, niche) {
  // Si la vidéo performe au-dessus du benchmark → fourchette supérieure
  if (engagementRate > (NICHE_BENCHMARKS[niche]?.engagement || 5)) {
    const lower = Math.round(views * 1.2 / 1000);
    const upper = Math.round(views * 1.8 / 1000);
    return `${lower}k-${upper}k`;
  }
  // Si vidéo moyenne
  const lower = Math.round(views * 0.7 / 1000);
  const upper = Math.round(views * 1.2 / 1000);
  return `${lower}k-${upper}k`;
}

// Horaire optimal en fonction de la niche (simplifié, à améliorer)
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

// Fréquence optimale
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

    console.log("Début scraping pour:", url, "Tier:", tier || "free");
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY manquante");
    }

    let data = null;
    let scrapingMethod = "bruteforce";

    try {
      data = await scrapeTikTokVideo(url);
      console.log("Données scrapées:", JSON.stringify(data, null, 2));
      
      if (!data.views || data.views === 0) {
        console.log("Bruteforce a retourné 0 vues");
        data = null;
      }
    } catch (e) {
      console.error("Erreur bruteforce:", e.message);
      data = null;
    }

    if (!data && tier === 'pro' && process.env.SCRAPINGBEE_API_KEY) {
      console.log("Tentative avec ScrapingBee...");
      scrapingMethod = "scrapingbee";
      
      try {
        const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
        const response = await client.get({
          url: url,
          params: {
            'render_js': true,
            'wait': 3000,
            'premium_proxy': true
          }
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
        console.error("Erreur ScrapingBee:", beeError);
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

    const totalInteractions =
      (data.likes || 0) +
      (data.comments || 0) +
      (data.shares || 0) +
      (data.saves || 0);
    const views = data.views || 1;
    const engagementRate = views > 0 ? (totalInteractions / views) * 100 : 0;
    const likeRate = views > 0 ? (data.likes / views) * 100 : 0;
    const commentRate = views > 0 ? (data.comments / views) * 100 : 0;
    const shareRate = views > 0 ? (data.shares / views) * 100 : 0;
    const saveRate = views > 0 ? (data.saves / views) * 100 : 0;

    const username = extractUsername(url);
    const detectedNiche = inferNiche(data.description, data.hashtags);
    const performanceLevel = getPerformanceLevel(engagementRate);
    const benchmarks = NICHE_BENCHMARKS[detectedNiche] || NICHE_BENCHMARKS["Lifestyle"];

    let analysis = null;
    let advice = "";
    let predictions = null;

    // ------ Calculs dynamiques prédictions ------
    const viralPotential = computeViralPotential(engagementRate, detectedNiche);
    const optimizedViews = computeOptimizedViews(views, engagementRate, detectedNiche);
    const bestPostTime = computeBestPostTime(detectedNiche);
    const optimalFrequency = computeOptimalFrequency(detectedNiche);

    // Analyse IA pour tier Pro
    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Prompt basé sur les stats & prédictions calculées
      const prompt = `Tu es consultant TikTok expert. À partir des données suivantes, produis une analyse personnalisée et génère des prédictions réalistes (pas génériques).

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

      console.log("Appel OpenAI...");
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Tu es un expert TikTok. Réponds UNIQUEMENT en JSON valide." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        analysis = aiResult.analysis;
        advice = aiResult.advice;
        predictions = aiResult.predictions;
      } catch (aiError) {
        console.error("Erreur IA:", aiError);
        advice = [{"title": "Erreur IA", "details": "L'analyse IA a échoué"}];
      }
    } else if (tier === 'free') {
      // Version gratuite : juste les conseils basiques
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = [
        `Tu es consultant TikTok senior. Analyse les stats suivantes et propose des conseils concrets et actionnables (FR).`,
        `URL: ${data.url}`,
        `Vues: ${data.views}`,
        `Likes: ${data.likes} (${pct(likeRate)}%)`,
        `Commentaires: ${data.comments} (${pct(commentRate)}%)`,
        `Partages: ${data.shares} (${pct(shareRate)}%)`,
        `Enregistrements: ${data.saves} (${pct(saveRate)}%)`,
        `Taux d'engagement global: ${pct(engagementRate)}%`,
        `Description: ${data.description}`,
        `Hashtags: ${data.hashtags.join(" ") || "(aucun)"}`,
        `Donne 6 à 8 recommandations classées par priorité.`,
      ].join("\n");

      console.log("Appel OpenAI basique...");
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un expert TikTok francophone, direct et précis." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      });

      advice = completion.choices?.[0]?.message?.content ?? "";
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
      advice: advice,

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
      analysis: analysis,
      predictions: predictions,
      tier: tier || 'free',
      scrapingMethod: scrapingMethod
    };

    // Sauvegarder en DB si tier Pro
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
        console.log("Analyse sauvegardée en DB");
      } catch (dbError) {
        console.error("Erreur sauvegarde DB:", dbError);
      }
    }

    return res.status(200).json(responseData);
    
  } catch (e) {
    console.error("Erreur complète:", e);
    return res.status(500).json({ 
      error: e.message || "Erreur serveur",
      debug: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
}
