import OpenAI from "openai";
const scrapingbee = require('scrapingbee'); 
import { extractFromHtml, computeRates } from '@/lib/extract';
import { inferNiche } from '@/lib/niche';
import { saveVideoAnalysis } from '@/lib/database';

function getPerformanceLevel(engagementRate) { if (engagementRate > 10) return "Virale"; if (engagementRate > 5) return "Excellente"; if (engagementRate > 3) return "Très bonne"; if (engagementRate > 1) return "Bonne"; if (engagementRate > 0.5) return "Moyenne"; return "Faible"; }
const NICHE_BENCHMARKS = { "Humour": { engagement: 8.5 }, "Danse": { engagement: 9.2 }, "Beauté/Mode": { engagement: 6.3 }, "Cuisine": { engagement: 7.1 }, "Fitness/Sport": { engagement: 5.2 }, "Éducation": { engagement: 4.8 }, "Tech": { engagement: 4.5 }, "Gaming": { engagement: 6.7 }, "Musique": { engagement: 7.8 }, "Lifestyle": { engagement: 5.5 } };
function extractUsername(url) { const match = url.match(/@([^/]+)/); return match ? match[1] : 'unknown'; }

export default async function handler(req, res) {
  try {
    const { url, tier } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    let html = "";
    if (tier === 'pro') {
      console.log("Tier Pro: Utilisation directe de ScrapingBee...");
      if (!process.env.SCRAPINGBEE_API_KEY) throw new Error("La clé API ScrapingBee est requise pour l'analyse Pro.");
      const bee = new scrapingbee.ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
      const beeResponse = await bee.get({ url: url, params: { 'render_js': true } });
      if (beeResponse.status < 200 || beeResponse.status >= 300) throw new Error(`ScrapingBee a échoué: ${beeResponse.status}`);
      const decoder = new TextDecoder();
      html = decoder.decode(beeResponse.data);
    } else {
      console.log("Tier Gratuit: Utilisation du fetch direct.");
      const initialResp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' } });
      if (!initialResp.ok) throw new Error(`Fetch direct a échoué (${initialResp.status})`);
      html = await initialResp.text();
    }

    const { description, hashtags, thumbnail, counts, duration } = extractFromHtml(html);
    const rates = computeRates(counts, duration);
    const username = extractUsername(url);
    const initialNiche = inferNiche(description, hashtags) || "Lifestyle";

    let aiAnalysis = null, advice = null, predictions = null, finalNiche = initialNiche;
    
    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      console.log("Lancement de l'analyse IA complète avec GPT-4o...");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const performanceLevel = getPerformanceLevel(rates.engagementRate || 0);
      
      try {
        const fullPrompt = `ANALYSE EXPERTE TIKTOK

DATA BRUTES:
- URL: ${url}
- Username: @${username}
- Description: ${description || "N/A"}
- Hashtags: ${hashtags.join(" ") || "Aucun"}
- Durée: ${duration}s
- Stats: Vues: ${counts.views}, Likes: ${counts.likes}, Engagement: ${rates.engagementRate?.toFixed(1)}%
- Performance estimée: ${performanceLevel}

MISSION:
Tu es un consultant TikTok de niveau international. Analyse les données ci-dessus et retourne un objet JSON unique. Sois précis, technique et sans concession.

FORMAT JSON REQUIS:
{
  "analysis": {
    "niche": "La niche la plus précise possible (ex: 'Humour absurde')",
    "subNiche": "La sous-catégorie (ex: 'Personnages récurrents')",
    "contentType": "Type de contenu (ex: 'Sketch', 'Tutoriel rapide')",
    "viralFactors": ["3-5 points forts qui expliquent la performance"],
    "weakPoints": ["2-3 points faibles à corriger en priorité"],
    "audienceProfile": {
      "ageRange": "Tranche d'âge estimée (ex: '18-24 ans')",
      "primaryGender": "Genre majoritaire estimé",
      "interests": ["3-4 centres d'intérêt probables de l'audience"]
    },
    "contentQuality": {
      "hookScore": "Note de 1 à 10 sur l'efficacité des 3 premières secondes",
      "retentionScore": "Note de 1 à 10 sur la capacité à garder le spectateur",
      "ctaScore": "Note de 1 à 10 sur l'efficacité de l'appel à l'action"
    },
    "hashtagAnalysis": {
      "effectiveness": "Note de 1 à 10 sur la pertinence des hashtags",
      "missing": ["2-3 hashtags recommandés à ajouter"],
      "trending": ${hashtags.some(h => ['fyp', 'pourtoi', 'viral'].includes(h.replace('#', '')))}
    }
  },
  "advice": [
    { "title": "Titre du conseil 1 (court et percutant)", "details": "Développement détaillé et actionnable du conseil 1." },
    { "title": "Titre du conseil 2", "details": "Développement détaillé et actionnable du conseil 2." },
    { "title": "Titre du conseil 3", "details": "Développement détaillé et actionnable du conseil 3." }
  ],
  "predictions": {
    "viralPotential": "Note de 1 à 10 sur le potentiel viral de ce créateur",
    "optimizedViews": "Fourchette de vues atteignable (ex: '150k-300k')",
    "bestPostTime": "Meilleur créneau horaire pour poster (ex: '18h-20h')",
    "optimalFrequency": "Fréquence de publication recommandée (ex: '3-4 vidéos/semaine')"
  }
}
`;
        
        const completion = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: "Tu es un expert TikTok qui retourne des analyses structurées en JSON." },{ role: "user", content: fullPrompt }],
          temperature: 0.4, 
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        aiAnalysis = aiResult.analysis;
        advice = aiResult.advice;
        predictions = aiResult.predictions;
        finalNiche = aiAnalysis?.niche || initialNiche;

      } catch (aiError) {
        console.error("Erreur IA:", aiError);
        advice = [{ title: "Erreur d'analyse IA", details: "L'analyse par l'IA a rencontré une erreur. Veuillez réessayer." }];
      }
    }

    const payload = { 
      thumbnail, 
      description: description || "aucune description trouvée", 
      hashtags, 
      niche: finalNiche, 
      username, 
      stats: { ...counts, ...rates, duration },
      metrics: { performanceLevel: getPerformanceLevel(rates.engagementRate || 0), engagementRate: rates.engagementRate }, 
      advice, 
      analysis: aiAnalysis, 
      predictions 
    };
    
    if (tier === 'pro') await saveVideoAnalysis(payload);

    return res.status(200).json(payload);

  } catch (err) {
    console.error('Erreur finale dans analyze.js:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
