// lib/scrape.js - Version adaptative
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

function extractAllJsonObjects(scriptText) {
  const jsons = [];
  let depth = 0;
  let start = -1;
  
  for (let i = 0; i < scriptText.length; i++) {
    if (scriptText[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (scriptText[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const jsonStr = scriptText.slice(start, i + 1);
          const parsed = JSON.parse(jsonStr);
          jsons.push(parsed);
        } catch (e) {
          // JSON invalide, on continue
        }
        start = -1;
      }
    }
  }
  return jsons;
}

function searchStatsInObject(obj, path = "") {
  if (!obj || typeof obj !== 'object') return null;
  
  // Cherche directement les propriétés de stats connues
  if (obj.playCount !== undefined || obj.diggCount !== undefined) {
    console.log(`Found stats at path: ${path}`);
    return {
      views: countMap(obj.playCount),
      likes: countMap(obj.diggCount), 
      comments: countMap(obj.commentCount),
      shares: countMap(obj.shareCount),
      saves: countMap(obj.collectCount ?? 0),
      desc: obj.desc || obj.text || ""
    };
  }
  
  // Recherche récursive
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const result = searchStatsInObject(value[i], `${path}.${key}[${i}]`);
        if (result) return result;
      }
    } else if (typeof value === 'object' && value !== null) {
      const result = searchStatsInObject(value, `${path}.${key}`);
      if (result) return result;
    }
  }
  
  return null;
}

function analyzeScriptContent(scriptText) {
  // Extrait tous les objets JSON du script
  const jsonObjects = extractAllJsonObjects(scriptText);
  console.log(`Found ${jsonObjects.length} JSON objects in script`);
  
  for (let i = 0; i < jsonObjects.length; i++) {
    const stats = searchStatsInObject(jsonObjects[i], `json[${i}]`);
    if (stats) {
      return stats;
    }
  }
  
  return null;
}

function extractHashtags(text) {
  if (!text) return [];
  return Array.from(new Set((text.match(/#\w+/g) || []).map((t) => t.toLowerCase())));
}

export async function scrapeTikTokVideo(videoUrl) {
  console.log("Starting adaptive scrape for:", videoUrl);
  
  if (!/^https?:\/\/(www\.)?tiktok\.com\//i.test(videoUrl)) {
    throw new Error("URL TikTok invalide.");
  }

  const resp = await fetch(videoUrl, { headers: HEADERS });
  console.log("Fetch response status:", resp.status);
  
  if (!resp.ok) {
    throw new Error(`Impossible de charger la page TikTok. Status: ${resp.status}`);
  }
  
  const html = await resp.text();
  console.log("HTML length:", html.length);

  // Extrait tous les scripts
  const scripts = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    scripts.push(m[1]);
  }
  
  console.log(`Found ${scripts.length} scripts`);

  // Stratégie 1: Chercher dans tous les scripts qui contiennent des données JSON
  let stats = null;
  
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    
    // Skip les scripts sans contenu JSON
    if (!script.includes('{') || script.length < 100) continue;
    
    console.log(`Analyzing script ${i} (${script.length} chars)`);
    
    const foundStats = analyzeScriptContent(script);
    if (foundStats) {
      console.log("Stats successfully extracted from script", i);
      stats = foundStats;
      break;
    }
  }

  // Stratégie 2: Regex fallback pour chercher des patterns dans le HTML brut
  if (!stats) {
    console.log("Trying regex fallback on HTML");
    
    const patterns = [
      /"playCount":(\d+)/,
      /"play_count":(\d+)/,
      /"viewCount":(\d+)/,
      /"view_count":(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log("Found view count via regex:", match[1]);
        // Si on trouve au moins les vues, on peut essayer d'extraire le reste
        const views = parseInt(match[1]);
        
        // Cherche les autres métriques autour de cette zone
        const contextStart = Math.max(0, html.indexOf(match[0]) - 1000);
        const contextEnd = Math.min(html.length, html.indexOf(match[0]) + 1000);
        const context = html.slice(contextStart, contextEnd);
        
        const likes = context.match(/"diggCount":(\d+)/) || context.match(/"like_count":(\d+)/);
        const comments = context.match(/"commentCount":(\d+)/) || context.match(/"comment_count":(\d+)/);
        const shares = context.match(/"shareCount":(\d+)/) || context.match(/"share_count":(\d+)/);
        
        stats = {
          views: views,
          likes: likes ? parseInt(likes[1]) : 0,
          comments: comments ? parseInt(comments[1]) : 0,
          shares: shares ? parseInt(shares[1]) : 0,
          saves: 0, // Pas trouvé
          desc: ""
        };
        
        console.log("Extracted stats via regex:", stats);
        break;
      }
    }
  }

  if (!stats) {
    // Debug: afficher un extrait des scripts les plus prometteurs
    console.log("Debug - Checking for any JSON-like content:");
    scripts.slice(0, 10).forEach((script, i) => {
      if (script.includes('playCount') || script.includes('diggCount') || script.includes('stats')) {
        console.log(`Script ${i} contains stats keywords:`, script.substring(0, 500));
      }
    });
    
    throw new Error("Statistiques introuvables - TikTok a probablement modifié sa structure");
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
