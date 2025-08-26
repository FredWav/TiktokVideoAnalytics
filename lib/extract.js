import * as cheerio from 'cheerio';

// --- Fonctions de l'ancienne méthode (brute-force) ---
function old_parseCount(raw) {
    if (raw == null) return 0;
    if (typeof raw === "number") return raw;
    const s = String(raw).trim().toUpperCase().replaceAll(",", ".");
    const m = s.match(/^([0-9]*\.?[0-9]+)\s*([K|M|B])?$/);
    if (!m) return Number.parseInt(s.replace(/\D/g, ""), 10) || 0;
    const n = parseFloat(m[1]);
    const suf = m[2];
    if (suf === "K") return Math.round(n * 1_000);
    if (suf === "M") return Math.round(n * 1_000_000);
    if (suf === "B") return Math.round(n * 1_000_000_000);
    return Math.round(n);
}

function old_searchStatsInObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.playCount !== undefined || obj.diggCount !== undefined) {
        return {
            views: old_parseCount(obj.playCount),
            likes: old_parseCount(obj.diggCount),
            comments: old_parseCount(obj.commentCount),
            shares: old_parseCount(obj.shareCount),
            saves: old_parseCount(obj.collectCount ?? 0),
            desc: obj.desc || obj.text || ""
        };
    }
    for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
            const result = old_searchStatsInObject(value);
            if (result) return result;
        }
    }
    return null;
}

// --- Fonctions de la nouvelle méthode (ciblée) ---
export function parseCount(input) {
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

export function extractFromHtml(html) {
  const $ = cheerio.load(html);

  // ---- Stratégie 1 : Nouvelle méthode ciblée (rapide) ----
  const counts = {
    views: parseCount($('[data-e2e="play-count"]').first().text()),
    likes: parseCount($('[data-e2e="like-count"]').first().text()),
    comments: parseCount($('[data-e2e="comment-count"]').first().text()),
    shares: parseCount($('[data-e2e="share-count"]').first().text()),
    saves: parseCount($('[data-e2e="favorite-count"], [data-e2e="collect-count"]').first().text())
  };

  let description = '';
  let hashtags = [];
  let thumbnail = '';
  
  const sigiRaw = $('#SIGI_STATE').html() || '';
  if (sigiRaw) {
    try {
      const sigi = JSON.parse(sigiRaw);
      const itemId = Object.keys(sigi?.ItemModule || {})[0];
      if (itemId) {
        const item = sigi.ItemModule[itemId];
        counts.views ||= Number(item?.stats?.playCount) || 0;
        counts.likes ||= Number(item?.stats?.diggCount) || 0;
        counts.comments ||= Number(item?.stats?.commentCount) || 0;
        counts.shares ||= Number(item?.stats?.shareCount) || 0;
        counts.saves ||= Number(item?.stats?.collectCount) || 0;
        description = description || item?.desc || '';
        if (Array.isArray(item?.textExtra)) {
          hashtags = item.textExtra.filter(x => x?.hashtagName).map(x => `#${String(x.hashtagName).toLowerCase()}`);
        }
        thumbnail = thumbnail || item?.video?.cover || item?.video?.dynamicCover || '';
      }
    } catch (_) {}
  }
  
  if (counts.views > 0) {
      if (!description) description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
      if (!thumbnail) thumbnail = $('meta[property="og:image"]').attr('content') || '';
      if (hashtags.length === 0) hashtags = Array.from(new Set((description.match(/#\w+/g) || []).map(t => t.toLowerCase())));
      console.log("Extraction réussie avec la méthode ciblée (Cheerio).");
      return { description: description.trim(), hashtags, thumbnail, counts };
  }

  // ---- Stratégie 2 : Ancienne méthode brute-force (lente mais robuste) ----
  console.log("La méthode ciblée a échoué. Tentative avec la méthode brute-force...");
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  let old_stats = null;
  
  for (const scriptTag of scripts) {
      if (!scriptTag.includes('{')) continue;
      try {
          const scriptContent = scriptTag.replace(/<[^>]*>/g, '');
          const potentialJson = JSON.parse(scriptContent);
          old_stats = old_searchStatsInObject(potentialJson);
          if (old_stats?.views > 0) break;
      } catch (e) {}
  }

  if (old_stats?.views > 0) {
      console.log("Extraction réussie avec la méthode brute-force pour les stats.");
      counts.views = old_stats.views;
      counts.likes = old_stats.likes;
      counts.comments = old_stats.comments;
      counts.shares = old_stats.shares;
      counts.saves = old_stats.saves;
      
      // --- AMÉLIORATION : On ajoute la recherche des métadonnées ici ---
      console.log("Tentative d'extraction des métadonnées (description, miniature)...");
      description = $('meta[property="og:description"]').attr('content') || old_stats.desc || '';
      thumbnail = $('meta[property="og:image"]').attr('content') || '';
      hashtags = Array.from(new Set((description.match(/#\w+/g) || []).map(t => t.toLowerCase())));

  } else {
      console.log("Toutes les méthodes d'extraction ont échoué.");
  }

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
