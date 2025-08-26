import * as cheerio from 'cheerio';

export function parseCount(input) {
  if (input == null) return 0;
  let s = String(input).trim();

  // normalisation séparateurs et espaces
  s = s.replace(/\u00A0/g, ' ').replace(/,/g, '.');

  // formats "12.3K" / "4.7M"
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

  // fallback: ne garder que les chiffres
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

export function extractFromHtml(html) {
  const $ = cheerio.load(html);

  // ---- counts (DOM->SIGI fallback)
  const counts = {
    views:   parseCount($('[data-e2e="play-count"]').first().text()),
    likes:   parseCount($('[data-e2e="like-count"]').first().text()),
    comments:parseCount($('[data-e2e="comment-count"]').first().text()),
    shares:  parseCount($('[data-e2e="share-count"]').first().text()),
    // enregistrements (selon versions web : favorite/collect)
    saves:   parseCount($('[data-e2e="favorite-count"], [data-e2e="collect-count"]').first().text())
  };

  let description = '';
  let hashtags = [];
  let thumbnail = '';

  // ---- SIGI_STATE (le plus fiable)
  const sigiRaw = $('#SIGI_STATE').html() || '';
  if (sigiRaw) {
    try {
      const sigi = JSON.parse(sigiRaw);
      const itemId = Object.keys(sigi?.ItemModule || {})[0];
      if (itemId) {
        const item = sigi.ItemModule[itemId];

        // counts fallback depuis stats
        counts.views    ||= Number(item?.stats?.playCount)    || 0;
        counts.likes    ||= Number(item?.stats?.diggCount)    || 0;
        counts.comments ||= Number(item?.stats?.commentCount) || 0;
        counts.shares   ||= Number(item?.stats?.shareCount)   || 0;
        counts.saves    ||= Number(item?.stats?.collectCount) || 0;

        // description + hashtags
        description = description || item?.desc || '';
        if (hashtags.length === 0 && Array.isArray(item?.textExtra)) {
          hashtags = item.textExtra
            .filter(x => x?.hashtagName)
            .map(x => `#${String(x.hashtagName).toLowerCase()}`);
        }

        // miniature
        thumbnail = thumbnail || item?.video?.cover || item?.video?.dynamicCover || item?.video?.originCover || '';
      }
    } catch (_) {}
  }

  // ---- JSON-LD fallback
  if ((!description || hashtags.length === 0) || !thumbnail) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (!description && typeof data?.name === 'string') description = data.name;
        if (hashtags.length === 0 && data?.keywords) {
          const list = Array.isArray(data.keywords) ? data.keywords : String(data.keywords).split(',');
          hashtags = list
            .map(s => `#${String(s).trim().replace(/^#/, '').toLowerCase()}`)
            .filter(Boolean);
        }
        if (!thumbnail && typeof data?.thumbnailUrl === 'string') thumbnail = data.thumbnailUrl;
      } catch (_) {}
    });
  }

  // ---- Meta OG fallback
  if (!description) {
    description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';
  }
  if (!thumbnail) {
    thumbnail = $('meta[property="og:image"]').attr('content') || '';
  }

  hashtags = Array.from(new Set(hashtags));
  return { description: description.trim(), hashtags, thumbnail, counts };
}

export function computeRates(counts) {
  const views = Number(counts.views) || 0;
  const likes = Number(counts.likes) || 0;
  const comments = Number(counts.comments) || 0;
  const shares = Number(counts.shares) || 0;
  const saves = Number(counts.saves) || 0;

  const totalInteractions = likes + comments + shares + saves;

  const pct = (num) => (views > 0 ? +( (num / views) * 100 ).toFixed(2) : null);

  return {
    totalInteractions,
    engagementRate: views > 0 ? +((totalInteractions / views) * 100).toFixed(2) : null,
    likeRate: pct(likes),
    commentRate: pct(comments),
    shareRate: pct(shares),
    saveRate: pct(saves)
  };
}
