import * as cheerio from 'cheerio';

function parseCount(input) {
  if (input == null) return 0;
  let s = String(input).trim().replace(/\u00A0/g, ' ').replace(/,/g, '.');
  const m = s.match(/^([\d.\s]+)\s*([KM])?$/i);
  if (m) {
    let num = parseFloat(m[1].replace(/\s/g, ''));
    const suf = (m[2] || '').toUpperCase();
    if (!isNaN(num)) {
      if (suf === 'K') num *= 1_000;
      if (suf === 'M') num *= 1_000_000;
      return Math.round(num);
    }
  }
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// Helper pour extraire les hashtags d'un texte
function extractHashtags(text) {
    if (!text) return [];
    return Array.from(new Set((text.match(/#\w+/g) || []).map(t => t.toLowerCase())));
}

export function extractFromHtml(html) {
  const $ = cheerio.load(html);
  const result = {
    description: '',
    hashtags: [],
    thumbnail: '',
    duration: 0,
    counts: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  };

  // Stratégie 1 : Le JSON de la page (SIGI_STATE), la source la plus riche
  try {
    const sigiRaw = $('#SIGI_STATE').html();
    if (sigiRaw) {
      const sigi = JSON.parse(sigiRaw);
      const itemId = Object.keys(sigi?.ItemModule || {})[0];
      if (itemId) {
        const item = sigi.ItemModule[itemId];
        result.counts.views = Number(item?.stats?.playCount) || 0;
        result.counts.likes = Number(item?.stats?.diggCount) || 0;
        result.counts.comments = Number(item?.stats?.commentCount) || 0;
        result.counts.shares = Number(item?.stats?.shareCount) || 0;
        result.counts.saves = Number(item?.stats?.collectCount) || 0;
        result.description = item?.desc || '';
        result.duration = item?.video?.duration || 0;
        result.thumbnail = item?.video?.cover || item?.video?.dynamicCover || '';
        if (Array.isArray(item?.textExtra)) {
          result.hashtags = item.textExtra.filter(x => x?.hashtagName).map(x => `#${String(x.hashtagName).toLowerCase()}`);
        }
        console.log("Extraction réussie via SIGI_STATE.");
      }
    }
  } catch (e) {
    console.log("SIGI_STATE non trouvé ou invalide, passage aux autres stratégies.");
  }

  // Stratégie 2 : Le JSON-LD (données structurées pour Google)
  if (!result.counts.views) {
    try {
      const ldJsonRaw = $('script[type="application/ld+json"]').html();
      if (ldJsonRaw) {
        const ldJson = JSON.parse(ldJsonRaw);
        result.counts.views = parseCount(ldJson.interactionStatistic?.find(s => s.interactionType.includes('WatchAction'))?.userInteractionCount) || 0;
        result.counts.likes = parseCount(ldJson.interactionStatistic?.find(s => s.interactionType.includes('LikeAction'))?.userInteractionCount) || 0;
        result.counts.comments = parseCount(ldJson.commentCount) || 0;
        result.description = result.description || ldJson.description || ldJson.caption || '';
        result.thumbnail = result.thumbnail || ldJson.thumbnailUrl || '';
        // La durée est au format ISO 8601 (ex: PT15S), on la convertit en secondes
        if (ldJson.duration) {
            const match = ldJson.duration.match(/PT(\d+)S/);
            if (match) result.duration = parseInt(match[1], 10);
        }
        console.log("Extraction partielle réussie via JSON-LD.");
      }
    } catch(e) {
      console.log("JSON-LD non trouvé ou invalide.");
    }
  }
  
  // Stratégie 3 : Les balises Meta (Facebook/Twitter OpenGraph)
  result.description = result.description || $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  result.thumbnail = result.thumbnail || $('meta[property="og:image"]').attr('content') || '';
  if (!result.duration) result.duration = parseInt($('meta[property="og:video:duration"]').attr('content'), 10) || 0;


  // Stratégie 4 : Sélecteurs Cheerio pour les stats si toujours manquantes
  if (!result.counts.views) result.counts.views = parseCount($('[data-e2e="play-count"]').first().text());
  if (!result.counts.likes) result.counts.likes = parseCount($('[data-e2e="like-count"]').first().text());
  if (!result.counts.comments) result.counts.comments = parseCount($('[data-e2e="comment-count"]').first().text());
  if (!result.counts.shares) result.counts.shares = parseCount($('[data-e2e="share-count"]').first().text());
  if (!result.counts.saves) result.counts.saves = parseCount($('[data-e2e="favorite-count"]').first().text());
  
  // Finalisation : Extraire les hashtags de la description si pas déjà trouvés
  if (result.hashtags.length === 0 && result.description) {
      result.hashtags = extractHashtags(result.description);
  }

  return result;
}

export function computeRates(counts, duration) {
  const views = Number(counts.views) || 0;
  const likes = Number(counts.likes) || 0;
  const comments = Number(counts.comments) || 0;
  const shares = Number(counts.shares) || 0;
  const saves = Number(counts.saves) || 0;

  const totalInteractions = likes + comments + shares + saves;
  const pct = (num) => (views > 0 ? +( (num / views) * 100 ).toFixed(2) : 0);
  
  // Nouveau : Taux de complétion estimé
  const estimatedCompletionRate = (duration > 0 && views > 0) ? +((totalInteractions / views) / duration * 100 * 5).toFixed(2) : 0;

  return {
    totalInteractions,
    engagementRate: views > 0 ? +((totalInteractions / views) * 100).toFixed(2) : 0,
    likeRate: pct(likes),
    commentRate: pct(comments),
    shareRate: pct(shares),
    saveRate: pct(saves),
    estimatedCompletionRate
  };
}
