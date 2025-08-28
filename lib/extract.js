// lib/extract.js
import * as cheerio from 'cheerio';

function parseCount(input) {
  if (input == null) return 0;
  if (typeof input === "number") return input;
  
  let s = String(input).trim().replace(/\u00A0/g, ' ').replace(/,/g, '.');
  const m = s.match(/^([\d.\s]+)\s*([KMB])?$/i);
  
  if (m) {
    let num = parseFloat(m[1].replace(/\s/g, ''));
    const suf = (m[2] || '').toUpperCase();
    if (!isNaN(num)) {
      if (suf === 'K') num *= 1_000;
      if (suf === 'M') num *= 1_000_000;
      if (suf === 'B') num *= 1_000_000_000;
      return Math.round(num);
    }
  }
  
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function extractHashtags(text) {
  if (!text) return [];
  return Array.from(new Set((text.match(/#\w+/g) || []).map(t => t.toLowerCase())));
}

// Fonction pour chercher dans tous les scripts
function findInScripts(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1], 10);
      if (value > 0) return value;
    }
  }
  return 0;
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

  // console.warn("Début extraction, HTML length:", html.length);

  // ========== STRATÉGIE 1: SIGI_STATE (le plus fiable) ==========
  try {
    const sigiScript = $('#SIGI_STATE, #__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (sigiScript) {
      // console.warn("SIGI_STATE trouvé, parsing...");
      const sigi = JSON.parse(sigiScript);
      
      // Parcourir ItemModule ou ItemList
      const itemModule = sigi?.ItemModule || sigi?.ItemList;
      if (itemModule) {
        const itemId = Object.keys(itemModule)[0];
        if (itemId) {
          const item = itemModule[itemId];
          
          // Stats
          result.counts.views = Number(item?.stats?.playCount || item?.statsV2?.playCount || item?.statistics?.playCount) || 0;
          result.counts.likes = Number(item?.stats?.diggCount || item?.statsV2?.diggCount || item?.statistics?.diggCount) || 0;
          result.counts.comments = Number(item?.stats?.commentCount || item?.statsV2?.commentCount || item?.statistics?.commentCount) || 0;
          result.counts.shares = Number(item?.stats?.shareCount || item?.statsV2?.shareCount || item?.statistics?.shareCount) || 0;
          result.counts.saves = Number(item?.stats?.collectCount || item?.statsV2?.collectCount || item?.statistics?.collectCount) || 0;
          
          // Métadonnées
          result.description = item?.desc || item?.description || item?.text || '';
          result.duration = item?.video?.duration || item?.music?.duration || 0;
          result.thumbnail = item?.video?.cover || item?.video?.dynamicCover || item?.video?.originCover || '';
          
          // Hashtags depuis textExtra
          if (Array.isArray(item?.textExtra)) {
            result.hashtags = item.textExtra
              .filter(x => x?.hashtagName)
              .map(x => `#${String(x.hashtagName).toLowerCase()}`);
          }
          
          // console.warn("Extraction SIGI_STATE réussie, vues:", result.counts.views);
          
          if (result.counts.views > 0) {
            return result;
          }
        }
      }
    }
  } catch (e) {
    // console.warn("Erreur parsing SIGI_STATE:", e.message);
  }

  // ========== STRATÉGIE 2: JSON-LD ==========
  try {
    const ldJsonScript = $('script[type="application/ld+json"]').html();
    if (ldJsonScript) {
      // console.warn("JSON-LD trouvé, parsing...");
      const ldJson = JSON.parse(ldJsonScript);
      
      // Stats depuis interactionStatistic
      if (ldJson.interactionStatistic) {
        ldJson.interactionStatistic.forEach(stat => {
          if (stat.interactionType?.includes('WatchAction')) {
            result.counts.views = parseCount(stat.userInteractionCount) || result.counts.views;
          }
          if (stat.interactionType?.includes('LikeAction')) {
            result.counts.likes = parseCount(stat.userInteractionCount) || result.counts.likes;
          }
        });
      }
      
      result.counts.comments = parseCount(ldJson.commentCount) || result.counts.comments;
      result.description = result.description || ldJson.description || ldJson.caption || '';
      result.thumbnail = result.thumbnail || ldJson.thumbnailUrl || ldJson.thumbnail || '';
      
      // Durée au format ISO 8601 (PT15S)
      if (ldJson.duration) {
        const match = ldJson.duration.match(/PT(\d+)S/);
        if (match) result.duration = parseInt(match[1], 10);
      }
      
      // console.warn("Extraction JSON-LD, vues:", result.counts.views);
    }
  } catch(e) {
    // console.warn("Erreur parsing JSON-LD:", e.message);
  }

  // ========== STRATÉGIE 3: Regex bruteforce dans tout le HTML ==========
  if (!result.counts.views) {
    // console.warn("Tentative extraction regex bruteforce...");
    
    // Patterns pour les vues
    const viewPatterns = [
      /"playCount":(\d+)/,
      /"play_count":(\d+)/,
      /"viewCount":(\d+)/,
      /"view_count":(\d+)/,
      /"views":(\d+)/,
      /playCount['"]\s*:\s*(\d+)/,
      /PlayCount['"]\s*:\s*(\d+)/
    ];
    
    result.counts.views = findInScripts(html, viewPatterns);
    
    if (result.counts.views > 0) {
      // console.warn("Vues trouvées par regex:", result.counts.views);
      
      // Chercher les autres stats autour
      const likePatterns = [
        /"diggCount":(\d+)/,
        /"like_count":(\d+)/,
        /"likes":(\d+)/,
        /diggCount['"]\s*:\s*(\d+)/
      ];
      
      const commentPatterns = [
        /"commentCount":(\d+)/,
        /"comment_count":(\d+)/,
        /"comments":(\d+)/,
        /commentCount['"]\s*:\s*(\d+)/
      ];
      
      const sharePatterns = [
        /"shareCount":(\d+)/,
        /"share_count":(\d+)/,
        /"shares":(\d+)/,
        /shareCount['"]\s*:\s*(\d+)/
      ];
      
      const savePatterns = [
        /"collectCount":(\d+)/,
        /"collect_count":(\d+)/,
        /"saves":(\d+)/,
        /collectCount['"]\s*:\s*(\d+)/
      ];
      
      result.counts.likes = findInScripts(html, likePatterns);
      result.counts.comments = findInScripts(html, commentPatterns);
      result.counts.shares = findInScripts(html, sharePatterns);
      result.counts.saves = findInScripts(html, savePatterns);
    }
  }

  // ========== STRATÉGIE 4: Sélecteurs CSS (fallback) ==========
  if (!result.counts.views) {
    // console.warn("Tentative extraction par sélecteurs CSS...");
    
    // Différents sélecteurs possibles
    const viewSelectors = [
      '[data-e2e="play-count"]',
      '[data-e2e="view-count"]',
      '.video-count',
      '.play-count',
      'strong[data-e2e="play-count"]'
    ];
    
    for (const selector of viewSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text();
        const parsed = parseCount(text);
        if (parsed > 0) {
          result.counts.views = parsed;
          // console.warn(`Vues trouvées via sélecteur ${selector}:`, parsed);
          break;
        }
      }
    }
    
    if (result.counts.views > 0) {
      result.counts.likes = parseCount($('[data-e2e="like-count"], [data-e2e="browse-like-count"]').first().text()) || 0;
      result.counts.comments = parseCount($('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]').first().text()) || 0;
      result.counts.shares = parseCount($('[data-e2e="share-count"]').first().text()) || 0;
      result.counts.saves = parseCount($('[data-e2e="favorite-count"], [data-e2e="undefined-count"]').first().text()) || 0;
    }
  }

  // ========== MÉTADONNÉES (toujours essayer de les récupérer) ==========
  
  // Description depuis meta tags
  if (!result.description) {
    result.description = 
      $('meta[property="og:description"]').attr('content') || 
      $('meta[name="description"]').attr('content') || 
      $('meta[property="twitter:description"]').attr('content') || 
      '';
  }
  
  // Thumbnail depuis meta tags
  if (!result.thumbnail) {
    result.thumbnail = 
      $('meta[property="og:image"]').attr('content') || 
      $('meta[property="og:image:secure_url"]').attr('content') ||
      $('meta[property="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';
  }
  
  // Durée depuis meta tags
  if (!result.duration) {
    const durationMeta = $('meta[property="video:duration"]').attr('content');
    if (durationMeta) {
      result.duration = parseInt(durationMeta, 10) || 0;
    }
  }
  
  // Hashtags depuis la description
  if (result.hashtags.length === 0 && result.description) {
    result.hashtags = extractHashtags(result.description);
  }

  // ========== LOG FINAL ==========
  // console.warn("Résultat final extraction:", {
  //   views: result.counts.views,
  //   likes: result.counts.likes,
  //   comments: result.counts.comments,
  //   shares: result.counts.shares,
  //   saves: result.counts.saves,
  //   hasDescription: !!result.description,
  //   hashtagCount: result.hashtags.length,
  //   hasThumbnail: !!result.thumbnail,
  //   duration: result.duration
  // });

  return result;
}

export function computeRates(counts, duration) {
  const views = Number(counts.views) || 0;
  const likes = Number(counts.likes) || 0;
  const comments = Number(counts.comments) || 0;
  const shares = Number(counts.shares) || 0;
  const saves = Number(counts.saves) || 0;

  const totalInteractions = likes + comments + shares + saves;
  const pct = (num) => (views > 0 ? +((num / views) * 100).toFixed(2) : 0);
  
  // Taux de complétion estimé (formule simplifiée)
  const estimatedCompletionRate = duration > 0 && views > 0 
    ? Math.min(100, (totalInteractions / views) * duration * 2) 
    : 0;

  return {
    totalInteractions,
    engagementRate: views > 0 ? +((totalInteractions / views) * 100).toFixed(2) : 0,
    likeRate: pct(likes),
    commentRate: pct(comments),
    shareRate: pct(shares),
    saveRate: pct(saves),
    estimatedCompletionRate: +estimatedCompletionRate.toFixed(2)
  };
}
