// pages/api/analyze.js
import OpenAI from "openai";
// MODIFICATION : On remplace l'ancienne ligne d'import par celle-ci
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
const NICHE_BENCHMARKS = { "Humour": { engagement: 8.5, likes: 7.2, comments: 0.8, shares: 0.5 }, "Danse": { engagement: 9.2, likes: 8.1, comments: 0.6, shares: 0.5 }, "Beauté/Mode": { engagement: 6.3, likes: 5.2, comments: 0.7, shares: 0.4 }, "Cuisine": { engagement: 7.1, likes: 6.0, comments: 0.6, shares: 0.5 }, "Fitness/Sport": { engagement: 5.2, likes: 4.3, comments: 0.5, shares: 0.4 }, "Éducation": { engagement: 4.8, likes: 3.9, comments: 0.6, shares: 0.3 }, "Tech": { engagement: 4.5, likes: 3.7, comments: 0.5, shares: 0.3 }, "Gaming": { engagement: 6.7, likes: 5.6, comments: 0.7, shares: 0.4 }, "Musique": { engagement: 7.8, likes: 6.7, comments: 0.6, shares: 0.5 }, "Lifestyle": { engagement: 5.5, likes: 4.6, comments: 0.5, shares: 0.4 } };
function extractUsername(url) {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : 'unknown';
}

export default async function handler(req, res) {
  try {
    const { url, tier } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    const initialResp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' } });
    if (!initialResp.ok) throw new Error(`Fetch direct a échoué (${initialResp.status})`);
    
    let html = await initialResp.text();
    let { description, hashtags, thumbnail, counts } = extractFromHtml(html);

    if (tier === 'pro' && (!description || !thumbnail)) {
      console.log("Données incomplètes, appel à ScrapingBee en renfort...");
      // C'est ici que l'ancienne version plantait. Maintenant ça va marcher.
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
    const detectedNiche = inferNiche(description, hashtags) || "Lifestyle";
    const username = extractUsername(url);
    const performanceLevel = getPerformanceLevel(rates.engagementRate || 0);

    let advice = null, analysis = null, predictions = null;
    
    if (tier === 'pro' && process.env.OPENAI_API_KEY) {
      console.log("Lancement de l'analyse IA (Tier Pro)...");
      // Ici tu peux remettre toute ta logique d'appel à OpenAI
      advice = `Analyse Pro pour @${username} dans la niche ${detectedNiche}. Conseils IA basés sur les données complètes.`; // Placeholder
    }

    const payload = { 
      thumbnail, 
      description: description || "aucune description trouvée", 
      hashtags, 
      niche: detectedNiche, 
      username, 
      stats: { ...counts, ...rates }, 
      metrics: { performanceLevel, engagementRate: rates.engagementRate }, 
      advice, 
      analysis, 
      predictions 
    };
    
    if (tier === 'pro') {
      await saveVideoAnalysis(payload);
    }

    return res.status(200).json(payload);

  } catch (err) {
    console.error('Erreur analyze.js:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
