// pages/api/patterns.js
import { getNicheInsights, getAnalysesByNiche, exportPatterns } from "../../lib/database";

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
        totalComments:
