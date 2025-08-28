// pages/api/patterns.js
import { getNicheInsights, getAnalysesByNiche, exportPatterns } from "@/lib/database";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { niche, action } = req.query;

    // Action: récupérer les insights d'une niche spécifique
    if (action === "insights" && niche) {
      const insights = await getNicheInsights(niche);
      
      if (!insights) {
        return res.status(404).json({ error: "Aucune donnée pour cette niche" });
      }

      return res.status(200).json({
        success: true,
        niche,
        insights,
        timestamp: new Date().toISOString()
      });
    }

    // Action: récupérer les analyses récentes d'une niche
    if (action === "recent" && niche) {
      const limit = parseInt(req.query.limit) || 20;
      const analyses = await getAnalysesByNiche(niche, limit);

      // Calculer des statistiques aggregées
      const aggregatedStats = analyses.reduce((acc, analysis) => {
        acc.totalViews += analysis.stats.views;
        acc.totalLikes += analysis.stats.likes;
        acc.totalComments += analysis.stats.comments;
        acc.avgEngagement += analysis.metrics.engagementRate;
        acc.count += 1;
        return acc;
      }, {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        avgEngagement: 0,
        count: 0
      });

      if (aggregatedStats.count > 0) {
        aggregatedStats.avgEngagement = aggregatedStats.avgEngagement / aggregatedStats.count;
      }

      // Identifier les top hashtags
      const hashtagFrequency = {};
      analyses.forEach(analysis => {
        analysis.hashtags.forEach(tag => {
          hashtagFrequency[tag] = (hashtagFrequency[tag] || 0) + 1;
        });
      });

      const topHashtags = Object.entries(hashtagFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count, percentage: (count / analyses.length * 100).toFixed(1) }));

      // Identifier les patterns de succès
      const successfulVideos = analyses.filter(a => a.metrics.engagementRate > 5);
      const failedVideos = analyses.filter(a => a.metrics.engagementRate < 1);

      const successPatterns = {
        avgViews: successfulVideos.reduce((sum, v) => sum + v.stats.views, 0) / (successfulVideos.length || 1),
        avgEngagement: successfulVideos.reduce((sum, v) => sum + v.metrics.engagementRate, 0) / (successfulVideos.length || 1),
        commonHashtags: getCommonElements(successfulVideos.map(v => v.hashtags)),
        commonContentTypes: getCommonElements(successfulVideos.map(v => v.analysis?.contentType).filter(Boolean))
      };

      const failurePatterns = {
        avgViews: failedVideos.reduce((sum, v) => sum + v.stats.views, 0) / (failedVideos.length || 1),
        avgEngagement: failedVideos.reduce((sum, v) => sum + v.metrics.engagementRate, 0) / (failedVideos.length || 1),
        commonIssues: getCommonElements(failedVideos.map(v => v.analysis?.weakPoints || []).flat())
      };

      return res.status(200).json({
        success: true,
        niche,
        analysisCount: analyses.length,
        aggregatedStats,
        topHashtags,
        successPatterns,
        failurePatterns,
        recentAnalyses: analyses.slice(0, 5).map(a => ({
          url: a.url,
          username: a.username,
          engagement: a.metrics.engagementRate,
          views: a.stats.views,
          timestamp: a.timestamp
        }))
      });
    }

    // Action: exporter tous les patterns
    if (action === "export") {
      const allPatterns = await exportPatterns();
      
      return res.status(200).json({
        success: true,
        patterns: allPatterns,
        timestamp: new Date().toISOString()
      });
    }

    // Action: comparer les niches
    if (action === "compare") {
      const niches = (req.query.niches || "").split(",").filter(Boolean);
      
      if (niches.length < 2) {
        return res.status(400).json({ error: "Veuillez fournir au moins 2 niches à comparer" });
      }

      const comparisons = {};
      
      for (const n of niches) {
        const insights = await getNicheInsights(n);
        if (insights) {
          comparisons[n] = {
            avgEngagement: insights.recentTrends?.avgEngagement || 0,
            viralThreshold: insights.recentTrends?.viralThreshold || 0,
            topHashtags: Object.keys(insights.recentTrends?.topHashtags || {}).slice(0, 5),
            bestTimes: insights.patterns?.bestPostingTimes || [],
            optimalDuration: insights.patterns?.optimalDuration || []
          };
        }
      }

      return res.status(200).json({
        success: true,
        comparison: comparisons,
        bestNiche: Object.entries(comparisons)
          .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)[0]?.[0],
        timestamp: new Date().toISOString()
      });
    }

    // Par défaut: retourner un résumé global
    const allNiches = ['comedy', 'dance', 'beauty', 'fashion', 'food', 'fitness', 'education', 'tech', 'gaming', 'pets', 'lifestyle', 'music', 'art', 'travel', 'sports'];
    const summary = {};

    for (const n of allNiches) {
      const analyses = await getAnalysesByNiche(n, 10);
      if (analyses.length > 0) {
        const avgEngagement = analyses.reduce((sum, a) => sum + a.metrics.engagementRate, 0) / analyses.length;
        summary[n] = {
          videoCount: analyses.length,
          avgEngagement: avgEngagement.toFixed(2),
          lastAnalysis: analyses[analyses.length - 1]?.timestamp
        };
      }
    }

    return res.status(200).json({
      success: true,
      summary,
      availableActions: ['insights', 'recent', 'export', 'compare'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erreur API patterns:", error);
    return res.status(500).json({ 
      error: error.message || "Erreur serveur",
      timestamp: new Date().toISOString()
    });
  }
}

// Fonction helper pour trouver les éléments communs
function getCommonElements(arrays) {
  if (!arrays || arrays.length === 0) return [];
  
  const flat = arrays.flat();
  const frequency = {};
  
  flat.forEach(item => {
    if (item) {
      frequency[item] = (frequency[item] || 0) + 1;
    }
  });
  
  return Object.entries(frequency)
    .filter(([_, count]) => count >= arrays.length * 0.3) // Au moins 30% d'occurrence
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item]) => item);
}
