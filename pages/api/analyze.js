// pages/api/analyze.js
import { extractFromHtml, computeRates } from '@/lib/extract';
import { inferNiche } from '@/lib/niche';

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

    // --- fetch HTML (sans fantaisie, juste des headers solides)
    const resp = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
        'accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'referer': 'https://www.google.com/'
      }
    });

    if (!resp.ok) {
      return res
        .status(502)
        .json({ error: `Impossible de récupérer la page (${resp.status}).` });
    }

    const html = await resp.text();

    // --- extraction robuste (description, hashtags, miniature, counts)
    const { description, hashtags, thumbnail, counts } = extractFromHtml(html);

    // --- calculs (engagement et sous-taux) — % déjà calculés ici
    const rates = computeRates(counts);

    // --- niche (seulement si déductible)
    const niche = inferNiche(description, hashtags);

    // --- messages humains quand il manque des infos
    const descOut = description ? description : 'aucune description trouvée';
    const tagsOut = hashtags && hashtags.length ? hashtags : [];
    const nicheOut = niche || 'Niche non identifiable à partir des éléments disponibles';

    const notices = [
      !description && 'Description non trouvée sur la page.',
      (!hashtags || hashtags.length === 0) && 'Aucun hashtag extrait.',
      (counts.shares == null) && 'Nombre de partages non disponible.'
    ].filter(Boolean);

    // --- payload final
    const payload = {
      thumbnail: thumbnail || null,
      description: descOut,
      hashtags: tagsOut,
      niche: nicheOut,
      stats: {
        views: counts.views || 0,
        likes: counts.likes || 0,
        comments: counts.comments || 0,
        shares: (counts.shares ?? 0),
        saves: (counts.saves ?? 0),
        totalInteractions: rates.totalInteractions,
        engagementRate: rates.engagementRate, // % (ex: 5.08) -> affiche "5.08%"
        likeRate: rates.likeRate,
        commentRate: rates.commentRate,
        shareRate: rates.shareRate,
        saveRate: rates.saveRate
      },
      notices
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error('analyze error:', err);
    return res.status(500).json({ error: 'Erreur serveur durant l’analyse.' });
  }
}
