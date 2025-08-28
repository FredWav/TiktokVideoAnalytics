// lib/scrape.js - Version bruteforce qui fonctionne
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0"
};

const countMap = (raw) => {
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
};

function extractHashtags(text) {
  if (!text) return [];
  return Array.from(new Set((text.match(/#\w+/g) || []).map((t) => t.toLowerCase())));
}

export async function scrapeTikTokVideo(videoUrl) {
  // console.warn("Starting adaptive scrape for:", videoUrl);
  
  if (!/^https?:\/\/(www\.)?tiktok\.com\//i.test(videoUrl)) {
    throw new Error("URL TikTok invalide.");
  }

  const resp = await fetch(videoUrl, { headers: HEADERS });
  // console.warn("Fetch response status:", resp.status);
  
  if (!resp.ok) {
    throw new Error(`Impossible de charger la page TikTok. Status: ${resp.status}`);
  }
  
  const html = await resp.text();
  // console.warn("HTML length:", html.length);

  let stats = {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    desc: ""
  };

  // Stratégie 1: Chercher SIGI_STATE ou UNIVERSAL_DATA_FOR_REHYDRATION
  try {
    const sigiMatch = html.match(/<script[^>]*id="(?:SIGI_STATE|__UNIVERSAL_DATA_FOR_REHYDRATION__)"[^>]*>(.*?)<\/script>/s);
    if (sigiMatch) {
      const jsonStr = sigiMatch[1];
      const data = JSON.parse(jsonStr);
      // console.warn("Found SIGI data");
      
      // Parcourir pour trouver les stats
      const findStats = (obj, depth = 0) => {
        if (!obj || depth > 10) return null;
        
        // Check direct stats properties
        if (obj.stats || obj.statistics || obj.statsV2) {
          const s = obj.stats || obj.statistics || obj.statsV2;
          return {
            views: s.playCount || s.viewCount || 0,
            likes: s.diggCount || s.likeCount || 0,
            comments: s.commentCount || 0,
            shares: s.shareCount || 0,
            saves: s.collectCount || s.saveCount || 0,
            desc: obj.desc || obj.text || ""
          };
        }
        
        // ItemModule pattern
        if (obj.ItemModule) {
          const firstKey = Object.keys(obj.ItemModule)[0];
          if (firstKey) {
            const item = obj.ItemModule[firstKey];
            if (item?.stats) {
              return {
                views: item.stats.playCount || 0,
                likes: item.stats.diggCount || 0,
                comments: item.stats.commentCount || 0,
                shares: item.stats.shareCount || 0,
                saves: item.stats.collectCount || 0,
                desc: item.desc || ""
              };
            }
          }
        }
        
        // Recursive search
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            const result = findStats(obj[key], depth + 1);
            if (result && result.views > 0) return result;
          }
        }
        return null;
      };
      
      const extracted = findStats(data);
      if (extracted) {
        stats = extracted;
        // console.warn("Stats extracted from SIGI:", stats);
      }
    }
  } catch (e) {
    // console.warn("SIGI parsing failed:", e.message);
  }

  // Stratégie 2: Regex patterns sur le HTML brut
  if (stats.views === 0) {
    // console.warn("Trying regex patterns...");
    
    // Chercher tous les patterns possibles pour les vues
    const viewPatterns = [
      /"playCount":(\d+)/,
      /"play_count":(\d+)/,
      /"viewCount":(\d+)/,
      /"view_count":(\d+)/,
      /playCount['"]\s*:\s*(\d+)/,
      /viewCount['"]\s*:\s*(\d+)/,
      /"views":(\d+)/,
      /"PlayCount":(\d+)/,
      /"ViewCount":(\d+)/
    ];
    
    for (const pattern of viewPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        stats.views = parseInt(match[1], 10);
        // console.warn("Found views with pattern:", pattern, "=", stats.views);
        break;
      }
    }
    
    // Si on a trouvé les vues, chercher le reste
    if (stats.views > 0) {
      const patterns = {
        likes: [/"diggCount":(\d+)/, /"like_count":(\d+)/, /"likes":(\d+)/, /diggCount['"]\s*:\s*(\d+)/],
        comments: [/"commentCount":(\d+)/, /"comment_count":(\d+)/, /"comments":(\d+)/, /commentCount['"]\s*:\s*(\d+)/],
        shares: [/"shareCount":(\d+)/, /"share_count":(\d+)/, /"shares":(\d+)/, /shareCount['"]\s*:\s*(\d+)/],
        saves: [/"collectCount":(\d+)/, /"collect_count":(\d+)/, /"saves":(\d+)/, /collectCount['"]\s*:\s*(\d+)/]
      };
      
      for (const [key, patterns_list] of Object.entries(patterns)) {
        for (const pattern of patterns_list) {
          const match = html.match(pattern);
          if (match && match[1]) {
            stats[key] = parseInt(match[1], 10);
            break;
          }
        }
      }
    }
  }

  // Stratégie 3: Chercher dans tous les scripts
  if (stats.views === 0) {
    // console.warn("Searching in all scripts...");
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    
    for (const scriptTag of scripts) {
      const script = scriptTag.replace(/<[^>]*>/g, '');
      
      // Skip small scripts
      if (script.length < 100) continue;
      
      // Look for stats keywords
      if (script.includes('playCount') || script.includes('diggCount')) {
        // console.warn("Found script with stats keywords");
        
        // Try to extract JSON objects
        const jsonMatches = script.match(/\{[^{}]*"(?:playCount|diggCount|stats)"[^{}]*\}/g) || [];
        for (const jsonStr of jsonMatches) {
          try {
            const obj = JSON.parse(jsonStr);
            if (obj.playCount || obj.stats?.playCount) {
              stats.views = obj.playCount || obj.stats?.playCount || 0;
              stats.likes = obj.diggCount || obj.stats?.diggCount || 0;
              stats.comments = obj.commentCount || obj.stats?.commentCount || 0;
              stats.shares = obj.shareCount || obj.stats?.shareCount || 0;
              stats.saves = obj.collectCount || obj.stats?.collectCount || 0;
              // console.warn("Extracted from JSON object:", stats);
              break;
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }
        
        if (stats.views > 0) break;
      }
    }
  }

  // Extraction de la description depuis les meta tags
  if (!stats.desc) {
    const metaDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);
    if (metaDesc) {
      stats.desc = metaDesc[1];
    }
  }

  // console.warn("Final stats:", stats);
  
  if (stats.views === 0) {
    // console.warn("Warning: Could not extract views, TikTok may have changed structure");
  }

  const hashtags = extractHashtags(stats.desc);
  
  return {
    url: videoUrl,
    views: stats.views || 0,
    likes: stats.likes || 0,
    comments: stats.comments || 0,
    shares: stats.shares || 0,
    saves: stats.saves || 0,
    description: stats.desc || "",
    hashtags,
  };
}
