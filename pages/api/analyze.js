// pages/api/analyze.js
import OpenAI from "openai";
import { scrapeTikTokVideo } from "../../lib/scrape";
import { saveVideoAnalysis } from "../../lib/database";

function pct(n) {
  return Number.isFinite(n) ? Math.round(n * 10000) / 100 : 0;
}

// Fonction pour déterminer la performance relative
function getPerformanceLevel(engagementRate) {
  if (engagementRate > 10) return "Virale";
  if (engagementRate > 5) return "Excellente";
  if (engagementRate > 3) return "Très bonne";
  if (engagementRate > 1) return "Bonne";
  if (engagementRate > 0.5) return "Moyenne";
  return "Faible";
}

// Benchmarks par niche TikTok (données moyennes 2024)
const NICHE_BENCHMARKS = {
  "comedy": { engagement: 8.5, likes: 7.2, comments: 0.8, shares: 0.5 },
  "dance": { engagement: 9.2, likes: 8.1, comments: 0.6, shares: 0.5 },
  "beauty": { engagement: 6.3, likes: 5.2, comments: 0.7, shares: 0.4 },
  "fashion": { engagement: 5.8, likes: 4.9, comments: 0.5, shares: 0.4 },
  "food": { engagement: 7.1, likes: 6.0, comments: 0.6, shares: 0.5 },
  "fitness": { engagement: 5.2, likes: 4.3, comments: 0.5, shares: 0.4 },
  "education": { engagement: 4.8, likes: 3.9, comments: 0.6, shares: 0.3 },
  "tech": { engagement: 4.5, likes: 3.7, comments: 0.5, shares: 0.3 },
  "gaming": { engagement: 6.7, likes: 5.6, comments: 0.7, shares: 0.4 },
  "pets": { engagement: 8.9, likes: 7.8, comments: 0.6, shares: 0.5 },
  "lifestyle": { engagement: 5.5, likes: 4.6, comments: 0.5, shares: 0.4 },
  "music": { engagement: 7.8, likes: 6.7, comments: 0.6, shares: 0.5 },
  "art": { engagement: 6.2, likes: 5.3, comments: 0.5, shares: 0.4 },
  "travel": { engagement: 5.9, likes: 5.0, comments: 0.5, shares: 0.4 },
  "sports": { engagement: 6.4, likes: 5.4, comments: 0.6, shares: 0.4 }
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "URL manquante" });

    console.log("Début scraping pour:", url);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY manquante");
      return res.status(500).json({ error: "Configuration OpenAI manquante" });
    }

    const data = await scrapeTikTokVideo(url);
    console.log("Données scrapées:", JSON.stringify(data, null, 2));

    // Calcul des métriques
    const totalInteractions =
      (data.likes || 0) +
      (data.comments || 0) +
      (data.shares || 0) +
      (data.saves || 0);
    const views = data.views || 0;
    const engagementRate = views > 0 ? (totalInteractions / views) * 100 : 0;
    const likeRate = views > 0 ? (data.likes / views) * 100 : 0;
    const commentRate = views > 0 ? (data.comments / views) * 100 : 0;
    const shareRate = views > 0 ? (data.shares / views) * 100 : 0;
    const saveRate = views > 0 ? (data.saves / views) * 100 : 0;

    const performanceLevel = getPerformanceLevel(engagementRate);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Premier appel : Analyse détaillée et détection de niche
    const analysisPrompt = `Tu es un expert TikTok senior avec 5 ans d'expérience. Analyse cette vidéo de manière ULTRA-PRÉCISE et TECHNIQUE.

URL: ${data.url}
Description: ${data.description || "Non disponible"}
Hashtags: ${data.hashtags.join(" ") || "Aucun"}

STATISTIQUES BRUTES:
- Vues: ${data.views.toLocaleString()}
- Likes: ${data.likes.toLocaleString()} (${pct(likeRate)}%)
- Commentaires: ${data.comments.toLocaleString()} (${pct(commentRate)}%)
- Partages: ${data.shares.toLocaleString()} (${pct(shareRate)}%)
- Sauvegardes: ${data.saves.toLocaleString()} (${pct(saveRate)}%)
- Engagement total: ${pct(engagementRate)}%
- Performance: ${performanceLevel}

ANALYSE REQUISE (Format JSON strict):
{
  "username": "extrait de l'URL ou 'inconnu'",
  "niche": "une seule niche parmi: comedy, dance, beauty, fashion, food, fitness, education, tech, gaming, pets, lifestyle, music, art, travel, sports, other",
  "subNiche": "sous-catégorie précise",
  "contentType": "type exact (tutoriel, challenge, storytelling, review, etc.)",
  "viralFactors": ["liste des éléments qui ont contribué au succès ou échec"],
  "weakPoints": ["points faibles identifiés"],
  "audienceProfile": {
    "ageRange": "estimation",
    "primaryGender": "estimation",
    "interests": ["centres d'intérêt probables"]
  },
  "contentQuality": {
    "hook": "analyse du hook (0-10)",
    "retention": "estimation rétention (0-10)",
    "cta": "efficacité du call-to-action (0-10)"
  },
  "hashtagAnalysis": {
    "effectiveness": "score 0-10",
    "missing": ["hashtags manquants recommandés"],
    "ineffective": ["hashtags à éviter"]
  }
}`;

    console.log("Analyse détaillée en cours...");
    const analysisCompletion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un analyste TikTok expert. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après." },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    let detailedAnalysis;
    try {
      detailedAnalysis = JSON.parse(analysisCompletion.choices?.[0]?.message?.content || "{}");
    } catch (e) {
      console.error("Erreur parsing JSON:", e);
      detailedAnalysis = {};
    }

    // Récupération des benchmarks pour la niche détectée
    const niche = detailedAnalysis.niche || "other";
    const benchmarks = NICHE_BENCHMARKS[niche] || NICHE_BENCHMARKS["lifestyle"];

    // Deuxième appel : Recommandations ultra-personnalisées
    const advicePrompt = `Tu es LE meilleur consultant TikTok au monde. Basé sur cette analyse PRÉCISE, donne des conseils ACTIONNABLES et MESURABLES.

VIDÉO ANALYSÉE:
- Niche: ${detailedAnalysis.niche} (${detailedAnalysis.subNiche})
- Type de contenu: ${detailedAnalysis.contentType}
- Performance: ${performanceLevel}
- Username: ${detailedAnalysis.username}

COMPARAISON AUX BENCHMARKS ${niche.toUpperCase()}:
- Engagement: ${pct(engagementRate)}% vs ${benchmarks.engagement}% (moyenne niche)
- Likes: ${pct(likeRate)}% vs ${benchmarks.likes}%
- Commentaires: ${pct(commentRate)}% vs ${benchmarks.comments}%
- Partages: ${pct(shareRate)}% vs ${benchmarks.shares}%

ANALYSE DÉTAILLÉE:
- Points forts: ${(detailedAnalysis.viralFactors || []).join(", ")}
- Points faibles: ${(detailedAnalysis.weakPoints || []).join(", ")}
- Score Hook: ${detailedAnalysis.contentQuality?.hook}/10
- Score Rétention: ${detailedAnalysis.contentQuality?.retention}/10
- Score CTA: ${detailedAnalysis.contentQuality?.cta}/10

PATTERNS DÉTECTÉS DANS CETTE NICHE:
- Les vidéos virales dans ${niche} ont généralement: un hook fort dans les 2 premières secondes, un rythme rapide, des transitions dynamiques
- Format optimal: ${niche === "education" ? "30-60 secondes" : niche === "comedy" ? "15-30 secondes" : "20-45 secondes"}

DONNE 8-10 RECOMMANDATIONS HYPER-SPÉCIFIQUES:
1. Chaque recommandation doit être MESURABLE et ACTIONNABLE
2. Inclus des exemples concrets de ce qui fonctionne dans cette niche
3. Propose des A/B tests spécifiques à faire
4. Suggère des formats/templates précis à tester
5. Mentionne des créateurs de référence dans cette niche
6. Donne des métriques cibles précises à atteindre

Format: Liste numérotée avec pour chaque point:
- Action concrète
- Pourquoi ça marche dans cette niche
- Objectif mesurable
- Exemple de mise en œuvre`;

    console.log("Génération des recommandations personnalisées...");
    const adviceCompletion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es le meilleur expert TikTok. Sois ULTRA-PRÉCIS, donne des exemples concrets, des chiffres, des noms. Évite le générique." },
        { role: "user", content: advicePrompt },
      ],
      temperature: 0.4,
    });

    const personalizedAdvice = adviceCompletion.choices?.[0]?.message?.content || "";

    // Troisième appel : Prédiction de performance
    const predictionPrompt = `Basé sur les patterns de cette niche (${niche}) et les métriques actuelles, prédit:

PRÉDICTIONS POUR LES PROCHAINES VIDÉOS:
1. Si l'utilisateur applique les recommandations, quel taux d'engagement peut-il espérer?
2. Combien de vues supplémentaires pourrait-il gagner?
3. Quel est le potentiel viral (score /10)?
4. Timing optimal de publication pour cette niche?
5. Fréquence de publication recommandée?

Sois précis avec des fourchettes réalistes.`;

    const predictionCompletion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Expert en prédictions TikTok basées sur des données réelles." },
        { role: "user", content: predictionPrompt },
      ],
      temperature: 0.3,
    });

    const predictions = predictionCompletion.choices?.[0]?.message?.content || "";

    // Sauvegarde en base de données
    const analysisData = {
      url: data.url,
      username: detailedAnalysis.username || "unknown",
      niche: detailedAnalysis.niche || "other",
      subNiche: detailedAnalysis.subNiche || "",
      contentType: detailedAnalysis.contentType || "",
      stats: {
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        saves: data.saves
      },
      metrics: {
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
        performanceLevel
      },
      description: data.description,
      hashtags: data.hashtags,
      analysis: detailedAnalysis,
      timestamp: new Date().toISOString()
    };

    // Sauvegarder l'analyse (fonction à implémenter selon votre choix de DB)
    try {
      await saveVideoAnalysis(analysisData);
    } catch (dbError) {
      console.error("Erreur sauvegarde DB:", dbError);
      // Continue même si la sauvegarde échoue
    }

    return res.status(200).json({
      data,
      metrics: {
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
        performanceLevel
      },
      analysis: detailedAnalysis,
      benchmarks: benchmarks,
      advice: personalizedAdvice,
      predictions: predictions
    });
  } catch (e) {
    console.error("Erreur complète:", e);
    return res.status(500).json({ 
      error: e.message || "Erreur serveur",
      debug: process.env.NODE_ENV === "development" ? e.stack : undefined
    });
  }
}
