// pages/api/analyze.js
import OpenAI from "openai";
import { extractFromHtml, computeRates } from '@/lib/extract';
import { inferNiche } from '@/lib/niche';
import { saveVideoAnalysis } from '@/lib/database';

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

// Extraire le username depuis l'URL
function extractUsername(url) {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL TikTok manquante ou invalide.' });
    }

    console.log("Début analyse pour:", url);

    // 1. Fetch et extraction HTML
    const resp = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'referer': 'https://www.google.com/'
      }
    });

    if (!resp.ok) {
      return res.status(502).json({ error: `Impossible de récupérer la page (${resp.status}).` });
    }

    const html = await resp.text();
    console.log("HTML récupéré, longueur:", html.length);

    // 2. Extraction des données avec ta méthode qui fonctionne
    const { description, hashtags, thumbnail, counts } = extractFromHtml(html);
    const rates = computeRates(counts);
    
    // 3. Détection de la niche et extraction du username
    const detectedNiche = inferNiche(description, hashtags) || "Lifestyle";
    const username = extractUsername(url);
    
    console.log("Données extraites:", { username, detectedNiche, counts });

    // 4. Performance et benchmarks
    const performanceLevel = getPerformanceLevel(rates.engagementRate || 0);
    const benchmarks = NICHE_BENCHMARKS[detectedNiche] || NICHE_BENCHMARKS["Lifestyle"];

    // 5. Analyse IA si OpenAI est configuré
    let aiAnalysis = null;
    let advice = null;
    let predictions = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Premier appel : Analyse détaillée
        const analysisPrompt = `Tu es un expert TikTok. Analyse cette vidéo de manière PRÉCISE et TECHNIQUE.

URL: ${url}
Username: @${username}
Description: ${description || "Non disponible"}
Hashtags: ${hashtags.join(" ") || "Aucun"}
Niche détectée: ${detectedNiche}

STATISTIQUES:
- Vues: ${counts.views}
- Likes: ${counts.likes} (${rates.likeRate?.toFixed(1)}%)
- Commentaires: ${counts.comments} (${rates.commentRate?.toFixed(1)}%)
- Partages: ${counts.shares} (${rates.shareRate?.toFixed(1)}%)
- Sauvegardes: ${counts.saves} (${rates.saveRate?.toFixed(1)}%)
- Engagement total: ${rates.engagementRate?.toFixed(1)}%
- Performance: ${performanceLevel}

ANALYSE REQUISE (Format JSON):
{
  "username": "${username}",
  "niche": "${detectedNiche}",
  "subNiche": "sous-catégorie précise basée sur le contenu",
  "contentType": "type de contenu (tutoriel, challenge, storytelling, review, etc.)",
  "viralFactors": ["3-5 éléments qui ont contribué au succès ou échec"],
  "weakPoints": ["2-3 points faibles identifiés"],
  "audienceProfile": {
    "ageRange": "estimation",
    "primaryGender": "estimation basée sur la niche",
    "interests": ["3-4 centres d'intérêt probables"]
  },
  "contentQuality": {
    "hook": "score 0-10 basé sur l'engagement",
    "retention": "score 0-10 basé sur les ratios",
    "cta": "score 0-10 basé sur les partages/saves"
  },
  "hashtagAnalysis": {
    "effectiveness": "score 0-10",
    "missing": ["2-3 hashtags recommandés"],
    "trending": ${hashtags.some(h => ['fyp', 'pourtoi', 'viral'].includes(h.replace('#', ''))) ? 'true' : 'false'}
  }
}`;

        const analysisCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Tu es un analyste TikTok expert. Réponds UNIQUEMENT en JSON valide." },
            { role: "user", content: analysisPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        });

        try {
          aiAnalysis = JSON.parse(analysisCompletion.choices?.[0]?.message?.content || "{}");
        } catch (e) {
          console.error("Erreur parsing JSON analyse:", e);
          aiAnalysis = {};
        }

        // Deuxième appel : Recommandations personnalisées
        const advicePrompt = `Tu es LE meilleur consultant TikTok. Donne 8 conseils ULTRA-PRÉCIS et ACTIONNABLES.

VIDÉO ANALYSÉE:
- Niche: ${detectedNiche}
- Performance: ${performanceLevel}
- Username: @${username}
- Engagement: ${rates.engagementRate?.toFixed(1)}% vs ${benchmarks.engagement}% (moyenne niche)

COMPARAISON AUX BENCHMARKS:
- Likes: ${rates.likeRate?.toFixed(1)}% vs ${benchmarks.likes}%
- Commentaires: ${rates.commentRate?.toFixed(1)}% vs ${benchmarks.comments}%
- Partages: ${rates.shareRate?.toFixed(1)}% vs ${benchmarks.shares}%

${rates.engagementRate > benchmarks.engagement ? 
  "La vidéo SURPERFORME dans sa niche. Identifie ce qui fonctionne et comment le répliquer." :
  "La vidéo SOUS-PERFORME. Identifie les problèmes et donne des solutions concrètes."}

Format: Liste numérotée avec pour chaque point:
1. **Titre court** : Action concrète et mesurable
2. **Titre court** : Autre action spécifique
...etc

Sois PRÉCIS avec des exemples, évite le générique.`;

        const adviceCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Expert TikTok donnant des conseils ultra-précis et actionnables." },
            { role: "user", content: advicePrompt }
          ],
          temperature: 0.5,
          max_tokens: 1000
        });

        advice = adviceCompletion.choices?.[0]?.message?.content || "";

        // Troisième appel : Prédictions
        const predictionPrompt = `Basé sur cette performance (${performanceLevel}) dans la niche ${detectedNiche}, prédit:

1. Potentiel viral de ce créateur (score /10)
2. Nombre de vues potentielles s'il applique les optimisations
3. Meilleure heure de publication pour cette niche
4. Fréquence de publication optimale

Sois précis et réaliste.`;

        const predictionCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Expert en prédictions TikTok basées sur des données." },
            { role: "user", content: predictionPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        predictions = predictionCompletion.choices?.[0]?.message?.content || "";

      } catch (aiError) {
        console.error("Erreur IA:", aiError);
        // Continue sans l'IA
      }
    }

    // 6. Sauvegarde en base de données
    const dataToSave = {
      url,
      username,
      niche: detectedNiche,
      subNiche: aiAnalysis?.subNiche || "",
      contentType: aiAnalysis?.contentType || "",
      stats: {
        views: counts.views || 0,
        likes: counts.likes || 0,
        comments: counts.comments || 0,
        shares: counts.shares || 0,
        saves: counts.saves || 0
      },
      metrics: {
        engagementRate: rates.engagementRate || 0,
        likeRate: rates.likeRate || 0,
        commentRate: rates.commentRate || 0,
        shareRate: rates.shareRate || 0,
        saveRate: rates.saveRate || 0,
        performanceLevel
      },
      description: description || "",
      hashtags: hashtags || [],
      thumbnail: thumbnail || "",
      analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    };

    try {
      await saveVideoAnalysis(dataToSave);
      console.log("Analyse sauvegardée avec succès");
    } catch (dbError) {
      console.error("Erreur sauvegarde DB:", dbError);
      // Continue même si la sauvegarde échoue
    }

    // 7. Préparer la réponse complète
    const notices = [
      !description && 'Description non trouvée sur la page.',
      (!hashtags || hashtags.length === 0) && 'Aucun hashtag extrait.',
      (counts.shares == null) && 'Nombre de partages non disponible.'
    ].filter(Boolean);

    return res.status(200).json({
      // Données de base (pour compatibilité)
      thumbnail: thumbnail || null,
      description: description || "aucune description trouvée",
      hashtags: hashtags || [],
      niche: detectedNiche,
      username,
      
      // Stats complètes
      stats: {
        views: counts.views || 0,
        likes: counts.likes || 0,
        comments: counts.comments || 0,
        shares: counts.shares || 0,
        saves: counts.saves || 0,
        totalInteractions: rates.totalInteractions,
        engagementRate: rates.engagementRate,
        likeRate: rates.likeRate,
        commentRate: rates.commentRate,
        shareRate: rates.shareRate,
        saveRate: rates.saveRate
      },
      
      // Nouvelles données
      metrics: {
        engagementRate: rates.engagementRate || 0,
        likeRate: rates.likeRate || 0,
        commentRate: rates.commentRate || 0,
        shareRate: rates.shareRate || 0,
        saveRate: rates.saveRate || 0,
        performanceLevel
      },
      
      // Analyse IA
      analysis: aiAnalysis,
      benchmarks,
      advice,
      predictions,
      
      // Notices
      notices,
      
      // Meta
      savedToDatabase: true
    });

  } catch (err) {
    console.error('Erreur complète analyze:', err);
    return res.status(500).json({ 
      error: 'Erreur serveur durant l\'analyse.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
