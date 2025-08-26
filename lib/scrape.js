// lib/scrape.js
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "DNT": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
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

function extractFirstJson(scriptText) {
  const start = scriptText.indexOf("{");
  const end = scriptText.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const maybe = scriptText.slice(start, end + 1);
  try {
    return JSON.parse(maybe);
  } catch {
    return null;
  }
}

function pickStatsFromState(state) {
  console.log("Analysing state structure...");
  
  // 1) Nouvelle structure __UNIVERSAL_DATA_FOR_REHYDRATION__
  if (state?.__DEFAULT_SCOPE__?.webapp?.pageProps?.dehydratedState?.queries) {
    console.log("Found __UNIVERSAL_DATA_FOR_REHYDRATION__ structure");
    const q = state.__DEFAULT_SCOPE__.webapp.pageProps.dehydratedState.queries;
    const node = q.find((x) =>
      JSON.stringify(x).includes("ItemModule") || JSON.stringify(x).includes("itemInfo")
    );
    const data = node?.state?.data ?? node?.state;
    
    if (data?.ItemModule) {
      console.log("Found ItemModule in new structure");
      const first = Object.values(data.ItemModule)[0];
      if (first?.stats) {
        console.log("Stats found:", first.stats);
        return {
          views: countMap(first.stats.playCount),
          likes: countMap(first.stats.diggCount),
          comments: countMap(first.stats.commentCount),
          shares: countMap(first.stats.shareCount),
          saves: countMap(first.stats.collectCount ?? 0),
          desc: first.desc ?? "",
        };
      }
    }
    
    if (data?.itemInfo?.itemStruct?.stats) {
      console.log("Found itemInfo.itemStruct.stats");
      const s = data.itemInfo.itemStruct.stats;
      console.log("Stats found:", s);
      return {
        views: countMap(s.playCount),
        likes: countMap(s.diggCount),
        comments: countMap(s.commentCount),
        shares: countMap(s.shareCount),
        saves: countMap(s.collectCount ?? 0),
        desc: data.itemInfo.itemStruct?.desc ?? "",
      };
    }
  }

  // 2) Ancienne structure SIGI_STATE
  if (state?.ItemModule) {
    console.log("Found SIGI_STATE ItemModule structure");
    const first = Object.values(state.ItemModule)[0];
    if (first?.stats) {
      console.log("Stats found in SIGI:", first.stats);
      return {
        views: countMap(first.stats.playCount),
        likes: countMap(first.stats.diggCount),
        comments: countMap(first.stats.commentCount),
        shares: countMap(first.stats.shareCount),
        saves: countMap(first.stats.collectCount ?? 0),
        desc: first.desc ?? "",
      };
    }
  }

  console.log("No recognized structure found. Available keys:", Object.keys(state || {}));
  return null;
}

function extractHashtags(text) {
  if (!text) return [];
  return Array.from(new Set((text.match(/#\w+/g) || []).map((t) => t.toLowerCase())));
}

export async function scrapeTikTokVideo(videoUrl) {
  console.log("Starting scrape for:", videoUrl);
  
  if (!/^https?:\/\/(www\.)?tiktok\.com\//i.test(videoUrl)) {
    throw new Error("URL TikTok invalide.");
  }

  const resp = await fetch(videoUrl, { headers: HEADERS });
  console.log("Fetch response status:", resp.status);
  
  if (!resp.ok) {
    console.log("Failed to fetch page. Status:", resp.status, resp.statusText);
    throw new Error(`Impossible de charger la page TikTok. Status: ${resp.status}`);
  }
  
  const html = await resp.text();
  console.log("HTML length:", html.length);
  console.log("HTML preview:", html.substring(0, 500));

  // Tente différents scripts connus
  const scripts = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  
  console.log(`Found ${scripts.length} scripts`);

  let stats = null;
  let scriptIndex = 0;
  
  for (const s of scripts) {
    if (
      s.includes("__UNIVERSAL_DATA_FOR_REHYDRATION__") ||
      s.includes("SIGI_STATE") ||
      s.includes('"ItemModule"')
    ) {
      console.log(`Processing script ${scriptIndex} with potential data`);
      console.log("Script preview:", s.substring(0, 200));
      
      const json = extractFirstJson(s);
      if (json) {
        console.log("JSON extracted successfully");
        const picked = pickStatsFromState(json);
        if (picked) {
          console.log("Stats successfully extracted:", picked);
          stats = picked;
          break;
        }
      } else {
        console.log("Failed to extract JSON from script");
      }
    }
    scriptIndex++;
  }

  if (!stats) {
    console.log("No stats found. Listing all script types:");
    scripts.forEach((script, i) => {
      if (script.includes("SIGI") || script.includes("UNIVERSAL") || script.includes("ItemModule")) {
        console.log(`Script ${i} contains:`, script.substring(0, 300));
      }
    });
    throw new Error("Statistiques introuvables (page privée ou structure modifiée).");
  }

  const hashtags = extractHashtags(stats.desc);
  return {
    url: videoUrl,
    views: stats.views,
    likes: stats.likes,
    comments: stats.comments,
    shares: stats.shares,
    saves: stats.saves,
    description: stats.desc || "",
    hashtags,
  };
}
