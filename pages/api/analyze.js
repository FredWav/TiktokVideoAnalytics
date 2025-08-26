import OpenAI from "openai";
import { scrapeTikTokVideo } from "../../lib/scrape";

function pct(n) {
  return Number.isFinite(n) ? Math.round(n * 10000) / 100 : 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "URL manquante" });

    console.log("Début scraping pour:", url);
    
    // Vérifiez si la clé OpenAI existe
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY manquante");
      return res.status(500).json({ error: "Configuration OpenAI manquante" });
    }

    const data = await scrapeTikTokVideo(url);
    console.log("Données scrapées:", JSON.stringify(data, null, 2));

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

    console.log("Appel OpenAI...");
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un expert TikTok francophone, direct et précis." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    return res.status(200).json({
      data,
      metrics: {
        engagementRate,
        likeRate,
        commentRate,
        shareRate,
        saveRate,
      },
      advice: completion.choices?.[0]?.message?.content ?? "",
    });
  } catch (e) {
    console.error("Erreur complète:", e);
    return res.status(500).json({ 
      error: e.message || "Erreur serveur",
      debug: e.stack
    });
  }
}
