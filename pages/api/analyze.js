// pages/api/analyze.js
import OpenAI from "openai";
import { ScrapingBeeClient } from 'scrapingbee'; // Import correct avec destructuring
import { extractFromHtml, computeRates } from '@/lib/extract';
import { inferNiche } from '@/lib/niche';
import { saveVideoAnalysis } from '@/lib/database';

// Helper functions
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { url, tier } = req.body || {};
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL TikTok manquante ou invalide.' });
    }

    console.log(`Analyse démarrée - Tier: ${tier || 'free'}, URL: ${url}`);

    let html = "";
    
    // Récupération du HTML selon le tier
    if (tier === 'pro') {
      console.log("Mode Pro: Utilisation de ScrapingBee pour un scraping fiable...");
      
      if (!process.env.SCRAPINGBEE_API_KEY) {
        throw new Error("Clé API ScrapingBee manquante. Configurez SCRAPINGBEE_API_KEY dans les variables d'environnement.");
      }
      
      try {
        const client = new ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
        
        const response = await client.get({
          url: url,
          params: {
            'render_js': true,
            'wait': 3000,
            'premium_proxy': true,
            'country_code': 'us'
          }
        });
        
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`ScrapingBee a échoué avec le statut: ${response.status}`);
        }
        
        // Conversion de la réponse en string
        const decoder = new TextDecoder();
        html = decoder.decode(response.data);
        console.log("ScrapingBee réussi, HTML récupéré:", html.length, "caractères");
        
      } catch (beeError) {
        console.error("Erreur ScrapingBee:", beeError);
        throw new Error(`Erreur ScrapingBee: ${beeError.message}`);
      }
      
    } else {
      console.log("Mode Gratuit: Fetch direct (peut être limité)...");
      
      const fetchResponse = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
          'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        }
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`Impossible de récupérer la page TikTok (${fetchResponse.status})`);
      }
      
      html = await fetchResponse.text();
      console.log("Fetch direct réussi, HTML récupéré:", html.length, "caractères");
    }

    // Extraction des données du HTML
    console.log("Extraction des données du HTML...");
    const { description, hashtags, thumbnail, counts, duration } = extractFromHtml(html);
    
    console.log("Données extraites:", {
      hasDescription: !!description,
      hashtagCount: hashtags?.length || 0,
      hasThumbnail: !!thumbnail,
      counts,
      duration
    });

    // Calcul des métriques
    const rates = computeRates(counts, duration);
    const username = extractUsername(url);
    const detectedNiche = inferNiche(description, hashtags) || "Lifestyle";
    const performanceLevel = getPerformanceLevel(rates.engagementRate || 0);
    const benchmarks = NICHE_BENCHMARKS[detectedNiche] || NICHE_BENCHMARKS["Lifestyle"];

    // Initialisation des variables pour l'IA
    let aiAnalysis = null;
    let advice = null;
    let predictions = null;
    let finalNiche = detectedNiche;

    // Analyse IA pour le tier Pro uniquement
    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      console.log("Lancement de l'analyse IA avec GPT-4o...");
      
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const aiPrompt = `Tu es un expert TikTok de niveau mondial. Analyse ces données et retourne un JSON structuré.

DONNÉES:
- URL: ${url}
- Username: @${username}
- Description: ${description || "Aucune"}
- Hashtags: ${hashtags.join(" ") || "Aucun"}
- Durée: ${duration}s
- Vues: ${counts.views.toLocaleString()}
- Likes: ${counts.likes.toLocaleString()} (${rates.likeRate?.toFixed(1)}%)
- Commentaires: ${counts.comments.toLocaleString()} (${rates.commentRate?.toFixed(1)}%)
- Partages: ${counts.shares.toLocaleString()} (${rates.shareRate?.toFixed(1)}%)
- Sauvegardes: ${counts.saves.toLocaleString()} (${rates.saveRate?.toFixed(1)}%)
- Engagement total: ${rates.engagementRate?.toFixed(1)}%
- Performance: ${performanceLevel}

COMPARAISON BENCHMARKS ${detectedNiche}:
- Engagement moyen niche: ${benchmarks.engagement}%
- ${rates.engagementRate > benchmarks.engagement ? 'SURPERFORME' : 'SOUS-PERFORME'} de ${Math.abs(rates.engagementRate - benchmarks.engagement).toFixed(1)}%

FORMAT JSON OBLIGATOIRE:
{
  "analysis": {
    "niche": "Niche précise (ex: 'Humour absurde')",
    "subNiche": "Sous-catégorie spécifique",
    "contentType": "Type exact (Sketch/Tutorial/Challenge/etc)",
    "viralFactors": ["3-5 facteurs de succès identifiés"],
    "weakPoints": ["2-3 points d'amélioration prioritaires"],
    "audienceProfile": {
      "ageRange": "18-24 ans",
      "primaryGender": "Mixte/Féminin/Masculin",
      "interests": ["4 centres d'intérêt"]
    },
    "contentQuality": {
      "hookScore": 8,
      "retentionScore": 7,
      "ctaScore": 6
    },
    "hashtagAnalysis": {
      "effectiveness": 7,
      "missing": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "trending": ${hashtags.some(h => ['#fyp', '#pourtoi', '#viral', '#foryou'].includes(h))}
    }
  },
  "advice": [
    {
      "title": "Améliorer le hook",
      "details": "Les 3 premières secondes doivent créer une tension narrative. Exemple: commencez par une question provocante ou un visuel surprenant."
    },
    {
      "title": "Optimiser les hashtags",
      "details": "Ajoutez 2-3 hashtags de niche spécifique avec 100k-1M de vues pour toucher une audience qualifiée."
    },
    {
      "title": "Augmenter l'engagement",
      "details": "Terminez par une question ouverte pour inciter aux commentaires. Les vidéos avec +50 commentaires ont 3x plus de reach."
    }
  ],
  "predictions": {
    "viralPotential": 7,
    "optimizedViews": "150k-300k",
    "bestPostTime": "18h-20h",
    "optimalFrequency": "3-4 vidéos/semaine"
  }
}

IMPORTANT: Les scores doivent être des NOMBRES (pas des strings). Sois précis et technique.`;

        const completion = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "Tu es un expert TikTok. Réponds UNIQUEMENT avec un JSON valide et structuré. Pas de texte avant ou après le JSON." 
            },
            { role: "user", content: aiPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        
        // Extraction et validation des résultats
        aiAnalysis = aiResult.analysis || null;
        advice = aiResult.advice || null;
        predictions = aiResult.predictions || null;
        
        // Mise à jour de la niche si l'IA en a trouvé une plus précise
        if (aiAnalysis?.niche) {
          finalNiche = aiAnalysis.niche;
        }
        
        // Conversion des scores en nombres si nécessaire
        if (aiAnalysis?.contentQuality) {
          aiAnalysis.contentQuality.hookScore = Number(aiAnalysis.contentQuality.hookScore) || 0;
          aiAnalysis.contentQuality.retentionScore = Number(aiAnalysis.contentQuality.retentionScore) || 0;
          aiAnalysis.contentQuality.ctaScore = Number(aiAnalysis.contentQuality.ctaScore) || 0;
        }
        if (aiAnalysis?.hashtagAnalysis) {
          aiAnalysis.hashtagAnalysis.effectiveness = Number(aiAnalysis.hashtagAnalysis.effectiveness) || 0;
        }
        if (predictions?.viralPotential) {
          predictions.viralPotential = Number(predictions.viralPotential) || 0;
        }
        
        console.log("Analyse IA complétée avec succès");
        
      } catch (aiError) {
        console.error("Erreur lors de l'analyse IA:", aiError);
        // On continue sans l'IA, les données de base sont toujours utiles
      }
    }

    // Construction de la réponse finale
    const responsePayload = {
      // Métadonnées
      thumbnail: thumbnail || null,
      description: description || "",
      hashtags: hashtags || [],
      niche: finalNiche,
      username,
      
      // Statistiques
      stats: {
        views: counts.views || 0,
        likes: counts.likes || 0,
        comments: counts.comments || 0,
        shares: counts.shares || 0,
        saves: counts.saves || 0,
        duration: duration || 0,
        totalInteractions: rates.totalInteractions || 0,
        engagementRate: rates.engagementRate || 0,
        likeRate: rates.likeRate || 0,
        commentRate: rates.commentRate || 0,
        shareRate: rates.shareRate || 0,
        saveRate: rates.saveRate || 0,
        estimatedCompletionRate: rates.estimatedCompletionRate || 0
      },
      
      // Métriques de performance
      metrics: {
        performanceLevel,
        engagementRate: rates.engagementRate || 0,
        likeRate: rates.likeRate || 0,
        commentRate: rates.commentRate || 0,
        shareRate: rates.shareRate || 0,
        saveRate: rates.saveRate || 0
      },
      
      // Benchmarks de la niche
      benchmarks,
      
      // Résultats IA (null si tier gratuit)
      analysis: aiAnalysis,
      advice: advice,
      predictions: predictions
    };

    // Sauvegarde en base de données pour le tier Pro
    if (tier === 'pro') {
      try {
        await saveVideoAnalysis({
          ...responsePayload,
          url,
          timestamp: new Date().toISOString()
        });
        console.log("Analyse sauvegardée en base de données");
      } catch (dbError) {
        console.error("Erreur sauvegarde DB:", dbError);
        // On continue même si la sauvegarde échoue
      }
    }

    // Retour de la réponse
    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('Erreur complète dans analyze.js:', error);
    
    return res.status(500).json({ 
      error: error.message || "Erreur serveur lors de l'analyse",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
