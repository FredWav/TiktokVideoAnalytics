// lib/database.js
// Option 1: Utiliser Vercel KV (Redis) - Recommandé pour production
// Option 2: Utiliser un fichier JSON local - Pour développement
// Option 3: Utiliser Supabase/Firebase - Pour scaling

import { kv } from '@vercel/kv'; // npm install @vercel/kv
import fs from 'fs/promises';
import path from 'path';

// Configuration
const USE_VERCEL_KV = process.env.KV_REST_API_URL ? true : false;
const DATA_FILE = path.join(process.cwd(), 'data', 'analyses.json');

// Patterns et insights par niche
const NICHE_PATTERNS = {
  comedy: {
    viralTriggers: ['unexpected twist', 'relatable situation', 'perfect timing', 'facial expressions'],
    optimalDuration: [15, 30],
    bestPostingTimes: ['12:00-14:00', '19:00-21:00'],
    topCreators: ['@khaby.lame', '@zachking', '@brittany_broski']
  },
  dance: {
    viralTriggers: ['trending audio', 'unique moves', 'tutorial format', 'duet potential'],
    optimalDuration: [15, 45],
    bestPostingTimes: ['16:00-18:00', '20:00-22:00'],
    topCreators: ['@charlidamelio', '@michael.le', '@jalaiah']
  },
  education: {
    viralTriggers: ['quick tips', 'visual demonstrations', 'problem-solving', 'life hacks'],
    optimalDuration: [30, 60],
    bestPostingTimes: ['08:00-10:00', '15:00-17:00'],
    topCreators: ['@onlyjayus', '@bentellect', '@cost_n_mayor']
  },
  // Ajouter d'autres niches...
};

// Sauvegarder une analyse
export async function saveVideoAnalysis(data) {
  try {
    if (USE_VERCEL_KV) {
      // Utiliser Vercel KV
      const key = `analysis:${data.username}:${Date.now()}`;
      await kv.set(key, data);
      
      // Ajouter à l'index par niche
      await kv.sadd(`niche:${data.niche}`, key);
      
      // Ajouter à l'index par username
      await kv.sadd(`user:${data.username}`, key);
      
      // Mettre à jour les statistiques globales
      await updateGlobalStats(data);
      
      console.log('Analyse sauvegardée dans Vercel KV:', key);
    } else {
      // Utiliser fichier JSON local
      let analyses = [];
      
      try {
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        analyses = JSON.parse(fileContent);
      } catch (e) {
        // Le fichier n'existe pas encore
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      }
      
      analyses.push(data);
      await fs.writeFile(DATA_FILE, JSON.stringify(analyses, null, 2));
      
      console.log('Analyse sauvegardée localement');
    }
    
    // Détecter des patterns
    await detectPatterns(data);
    
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    throw error;
  }
}

// Récupérer les analyses par niche
export async function getAnalysesByNiche(niche, limit = 100) {
  try {
    if (USE_VERCEL_KV) {
      const keys = await kv.smembers(`niche:${niche}`);
      const analyses = await Promise.all(
        keys.slice(0, limit).map(key => kv.get(key))
      );
      return analyses.filter(Boolean);
    } else {
      const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
      const analyses = JSON.parse(fileContent);
      return analyses
        .filter(a => a.niche === niche)
        .slice(-limit);
    }
  } catch (error) {
    console.error('Erreur récupération:', error);
    return [];
  }
}

// Récupérer les analyses par utilisateur
export async function getAnalysesByUser(username, limit = 50) {
  try {
    if (USE_VERCEL_KV) {
      const keys = await kv.smembers(`user:${username}`);
      const analyses = await Promise.all(
        keys.slice(0, limit).map(key => kv.get(key))
      );
      return analyses.filter(Boolean);
    } else {
      const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
      const analyses = JSON.parse(fileContent);
      return analyses
        .filter(a => a.username === username)
        .slice(-limit);
    }
  } catch (error) {
    console.error('Erreur récupération:', error);
    return [];
  }
}

// Détecter des patterns dans les données
async function detectPatterns(newData) {
  try {
    // Récupérer les analyses récentes de la même niche
    const nicheAnalyses = await getAnalysesByNiche(newData.niche, 50);
    
    if (nicheAnalyses.length < 10) return; // Pas assez de données
    
    // Calculer les moyennes et patterns
    const patterns = {
      niche: newData.niche,
      avgEngagement: 0,
      topHashtags: {},
      viralThreshold: 0,
      bestPerformers: [],
      worstPerformers: [],
      commonFactors: {}
    };
    
    // Analyser les performances
    let totalEngagement = 0;
    const hashtagCount = {};
    const viralVideos = [];
    const poorVideos = [];
    
    nicheAnalyses.forEach(analysis => {
      totalEngagement += analysis.metrics.engagementRate;
      
      // Compter les hashtags
      analysis.hashtags.forEach(tag => {
        hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
      });
      
      // Identifier les vidéos virales vs faibles
      if (analysis.metrics.engagementRate > 8) {
        viralVideos.push(analysis);
      } else if (analysis.metrics.engagementRate < 1) {
        poorVideos.push(analysis);
      }
    });
    
    patterns.avgEngagement = totalEngagement / nicheAnalyses.length;
    
    // Top hashtags
    patterns.topHashtags = Object.entries(hashtagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [tag, count]) => {
        acc[tag] = count;
        return acc;
      }, {});
    
    // Seuil viral pour cette niche
    patterns.viralThreshold = patterns.avgEngagement * 2;
    
    // Facteurs communs des vidéos virales
    if (viralVideos.length > 0) {
      const commonHashtags = {};
      const commonTypes = {};
      
      viralVideos.forEach(video => {
        video.hashtags.forEach(tag => {
          commonHashtags[tag] = (commonHashtags[tag] || 0) + 1;
        });
        commonTypes[video.contentType] = (commonTypes[video.contentType] || 0) + 1;
      });
      
      patterns.commonFactors = {
        hashtags: Object.entries(commonHashtags)
          .filter(([_, count]) => count >= viralVideos.length * 0.5)
          .map(([tag]) => tag),
        contentTypes: Object.entries(commonTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type)
      };
    }
    
    // Sauvegarder les patterns
    if (USE_VERCEL_KV) {
      await kv.set(`patterns:${newData.niche}`, patterns);
      await kv.expire(`patterns:${newData.niche}`, 86400); // Expire après 24h
    }
    
    console.log('Patterns détectés:', patterns);
    return patterns;
  } catch (error) {
    console.error('Erreur détection patterns:', error);
  }
}

// Mettre à jour les statistiques globales
async function updateGlobalStats(data) {
  try {
    if (USE_VERCEL_KV) {
      // Incrémenter les compteurs
      await kv.hincrby('stats:global', 'total_analyses', 1);
      await kv.hincrby('stats:global', 'total_views', data.stats.views);
      await kv.hincrby('stats:global', 'total_likes', data.stats.likes);
      await kv.hincrby(`stats:niche:${data.niche}`, 'count', 1);
      
      // Mettre à jour la moyenne d'engagement par niche
      const currentAvg = await kv.hget(`stats:niche:${data.niche}`, 'avg_engagement') || 0;
      const currentCount = await kv.hget(`stats:niche:${data.niche}`, 'count') || 1;
      const newAvg = ((currentAvg * (currentCount - 1)) + data.metrics.engagementRate) / currentCount;
      await kv.hset(`stats:niche:${data.niche}`, 'avg_engagement', newAvg);
    }
  } catch (error) {
    console.error('Erreur mise à jour stats:', error);
  }
}

// Récupérer les insights pour une niche
export async function getNicheInsights(niche) {
  try {
    const insights = {
      patterns: NICHE_PATTERNS[niche] || {},
      recentTrends: null,
      topPerformers: [],
      recommendations: []
    };
    
    if (USE_VERCEL_KV) {
      // Récupérer les patterns calculés
      const calculatedPatterns = await kv.get(`patterns:${niche}`);
      if (calculatedPatterns) {
        insights.recentTrends = calculatedPatterns;
      }
      
      // Récupérer les stats de la niche
      const nicheStats = await kv.hgetall(`stats:niche:${niche}`);
      insights.stats = nicheStats;
    }
    
    // Récupérer les top performers récents
    const recentAnalyses = await getAnalysesByNiche(niche, 20);
    insights.topPerformers = recentAnalyses
      .sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate)
      .slice(0, 5)
      .map(a => ({
        username: a.username,
        engagement: a.metrics.engagementRate,
        views: a.stats.views,
        hashtags: a.hashtags
      }));
    
    // Générer des recommendations basées sur les données
    if (insights.recentTrends) {
      insights.recommendations = generateRecommendations(insights.recentTrends);
    }
    
    return insights;
  } catch (error) {
    console.error('Erreur récupération insights:', error);
    return null;
  }
}

// Générer des recommandations basées sur les patterns
function generateRecommendations(patterns) {
  const recommendations = [];
  
  if (patterns.avgEngagement < 3) {
    recommendations.push({
      priority: 'high',
      type: 'engagement',
      message: `L'engagement moyen dans cette niche est de ${patterns.avgEngagement.toFixed(1)}%. Visez au moins ${(patterns.avgEngagement * 1.5).toFixed(1)}% pour surperformer.`
    });
  }
  
  if (patterns.topHashtags && Object.keys(patterns.topHashtags).length > 0) {
    const topTags = Object.keys(patterns.topHashtags).slice(0, 5);
    recommendations.push({
      priority: 'medium',
      type: 'hashtags',
      message: `Utilisez ces hashtags populaires dans votre niche: ${topTags.join(', ')}`
    });
  }
  
  if (patterns.commonFactors?.contentTypes?.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'content',
      message: `Les formats qui performent le mieux: ${patterns.commonFactors.contentTypes.join(', ')}`
    });
  }
  
  return recommendations;
}

// Exporter des patterns détectés (pour l'API)
export async function exportPatterns(niche = null) {
  try {
    if (niche) {
      return await getNicheInsights(niche);
    }
    
    // Exporter tous les patterns
    const allNiches = ['comedy', 'dance', 'beauty', 'fashion', 'food', 'fitness', 'education', 'tech', 'gaming', 'pets', 'lifestyle', 'music', 'art', 'travel', 'sports'];
    const allPatterns = {};
    
    for (const n of allNiches) {
      const insights = await getNicheInsights(n);
      if (insights) {
        allPatterns[n] = insights;
      }
    }
    
    return allPatterns;
  } catch (error) {
    console.error('Erreur export patterns:', error);
    return {};
  }
}
