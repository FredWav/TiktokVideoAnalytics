// pages/api/analyze.js
import OpenAI from "openai";
const scrapingbee = require('scrapingbee'); 
import { extractFromHtml, computeRates } from '@/lib/extract';
import { inferNiche } from '@/lib/niche';
import { saveVideoAnalysis } from '@/lib/database';

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
  try {
    const { url, tier } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    console.log(`Début analyse (Tier: ${tier}) pour:`, url);

    const initialResp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' } });
    if (!initialResp.ok) throw new Error(`Fetch direct a échoué (${initialResp.status})`);
    
    let html = await initialResp.text();
    let { description, hashtags, thumbnail, counts } = extractFromHtml(html);

    if (tier === 'pro' && (!description || !thumbnail)) {
      console.log("Données incomplètes, appel à ScrapingBee en renfort...");
      const bee = new scrapingbee.ScrapingBeeClient(process.env.SCRAPINGBEE_API_KEY);
      const beeResponse = await bee.get({ url: url, params: { 'render_js': true } });

      if (beeResponse.status < 200 || beeResponse.status >= 300) throw new Error(`ScrapingBee a échoué: ${beeResponse.status}`);
      
      const decoder = new TextDecoder();
      html = decoder.decode(beeResponse.data);
      
      const beeResult = extractFromHtml(html);
      description = beeResult.description || description;
      hashtags = (beeResult.hashtags?.length > 0) ? beeResult.hashtags : hashtags;
      thumbnail = beeResult.thumbnail || thumbnail;
      if (beeResult.counts.views > counts.views) counts = beeResult.counts;
    }

    const rates = computeRates(counts);
    const username = extractUsername(url);
    const initialNiche = inferNiche(description, hashtags) || "Lifestyle"; // Niche de base

    let aiAnalysis = null;
    let advice = null;
    let predictions = null;
    let finalNiche = initialNiche; // La niche finale sera celle de l'IA si dispo

    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      console.log("Lancement de l'analyse IA (Tier Pro)...");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const performanceLevel = getPerformanceLevel(rates.engagementRate || 0);
      const benchmarks = NICHE_BENCHMARKS[finalNiche] || NICHE_BENCHMARKS["Lifestyle"];

      try {
        // Premier appel : Analyse détaillée JSON
        const analysisPrompt = `Analyse cette vidéo TikTok en JSON. Niche: soit précis.
URL: ${url}, Username: @${username}, Description: ${description || "N/A"}
Stats: Vues: ${counts.views}, Likes: ${counts.likes} (${rates.likeRate?.toFixed(1)}%), Commentaires: ${counts.comments} (${rates.commentRate?.toFixed(1)}%), Partages: ${counts.shares} (${rates.shareRate?.toFixed(1)}%), Sauvegardes: ${counts.saves} (${rates.saveRate?.toFixed(1)}%), Engagement: ${rates.engagementRate?.toFixed(1)}%
Réponds UNIQUEMENT en JSON valide avec les clés: "niche", "subNiche", "contentType", "viralFactors" (array), "weakPoints" (array), "audienceProfile" (object), "contentQuality" (object), "hashtagAnalysis" (object).`;

        const analysisCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "Tu es un analyste TikTok expert. Réponds UNIQUEMENT en JSON valide." },{ role: "user", content: analysisPrompt }],
          temperature: 0.3, response_format: { type: "json_object" }
        });
        aiAnalysis = JSON.parse(analysisCompletion.choices?.[0]?.message?.content || "{}");
        finalNiche = aiAnalysis.niche || initialNiche; // On met à jour la niche avec celle de l'IA

        // Deuxième appel : Recommandations
        const advicePrompt = `Donne 8 conseils actionnables pour cette vidéo.
Niche: ${finalNiche}, Performance: ${performanceLevel}, Engagement: ${rates.engagementRate?.toFixed(1)}% vs ${benchmarks.engagement}% (moyenne niche).
${rates.engagementRate > benchmarks.engagement ? "SURPERFORME. Comment répliquer le succès ?" : "SOUS-PERFORME. Comment corriger les problèmes ?"}
Format: Liste numérotée. Sois précis.`;
        
        const adviceCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "Expert TikTok donnant des conseils ultra-précis." },{ role: "user", content: advicePrompt }],
          temperature: 0.5
        });
        advice = adviceCompletion.choices?.[0]?.message?.content || "";

        // Troisième appel : Prédictions
        const predictionPrompt = `Prédit en 4 points: 1. Potentiel viral du créateur (/10). 2. Vues potentielles avec optimisations. 3. Meilleure heure de publication. 4. Fréquence de publication. Niche: ${finalNiche}, Performance: ${performanceLevel}.`;
        
        const predictionCompletion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "Expert en prédictions TikTok." },{ role: "user", content: predictionPrompt }],
          temperature: 0.3
        });
        predictions = predictionCompletion.choices?.[0]?.message?.content || "";

      } catch (aiError) {
        console.error("Erreur IA:", aiError);
        advice = "L'analyse IA a échoué. Veuillez réessayer.";
      }
    }

    const payload = { 
      thumbnail, 
      description: description || "aucune description trouvée", 
      hashtags, 
      niche: finalNiche, 
      username, 
      stats: { ...counts, ...rates }, 
      metrics: { performanceLevel: getPerformanceLevel(rates.engagementRate || 0), engagementRate: rates.engagementRate }, 
      advice, 
      analysis: aiAnalysis, 
      predictions 
    };
    
    if (tier === 'pro') {
      await saveVideoAnalysis(payload);
    }

    return res.status(200).json(payload);

  } catch (err) {
    console.error('Erreur finale dans analyze.js:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
