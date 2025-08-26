import { scrapeTikTokVideo } from '../../lib/scrape.js';

/**
 * API route `/api/analyze` (POST).
 *
 * Ce handler reçoit une URL de vidéo TikTok, récupère les statistiques via la fonction `scrapeTikTokVideo`,
 * calcule des taux d'engagement et envoie ensuite un prompt à l'API OpenAI pour générer des conseils.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    // Scrape les données de la vidéo (placeholder)
    const data = await scrapeTikTokVideo(url);
    const { views, likes, comments, shares, collects, description, hashtags } = data;

    // Calcul des taux (évite la division par zéro)
    const safeDiv = (num, den) => den ? num / den : 0;
    const engagementRate = safeDiv(likes + comments + shares + collects, views) * 100;
    const likeRate = safeDiv(likes, views) * 100;
    const commentRate = safeDiv(comments, views) * 100;
    const shareRate = safeDiv(shares, views) * 100;

    // Construit le prompt pour GPT
    const metricsText = `Statistiques de la vidéo :\nVues : ${views}\nLikes : ${likes}\nCommentaires : ${comments}\nPartages : ${shares}\nEnregistrements : ${collects}.\n\nTaux d'engagement : ${engagementRate.toFixed(2)}%. Taux de likes : ${likeRate.toFixed(2)}%. Taux de commentaires : ${commentRate.toFixed(2)}%. Taux de partages : ${shareRate.toFixed(2)}%.`;

    const promptMessages = [
      {
        role: 'system',
        content: "Tu es un expert en marketing digital spécialisé dans l'analyse de vidéos TikTok. Tes réponses sont structurées, informatives et rédigées en français accessible."
      },
      {
        role: 'user',
        content: `Analyse cette vidéo TikTok et propose des conseils pour améliorer son impact.\n\nDescription : ${description}\nHashtags : ${hashtags.join(', ')}\n${metricsText}`
      }
    ];

    // Appel à l'API OpenAI via fetch
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: promptMessages,
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const json = await response.json();
    const advice = json.choices?.[0]?.message?.content?.trim() || '';
    res.status(200).json({
      data,
      engagementRate: engagementRate.toFixed(2),
      likeRate: likeRate.toFixed(2),
      commentRate: commentRate.toFixed(2),
      shareRate: shareRate.toFixed(2),
      advice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l’analyse de la vidéo.' });
  }
}