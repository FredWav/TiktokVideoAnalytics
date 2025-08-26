// lib/scrape.js
// Scraping côté serveur (API Next) : on récupère le HTML de TikTok et on lit le JSON embarqué.
// Pas d’API TikTok. Fonctionne en serverless tant que la page est publique.

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
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
  // Cherche le premier objet JSON valide dans le script (robuste aux variations SIGI_STATE / UNIVERSAL_DATA)
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
  // Plusieurs variantes existent; on couvre les plus fréquentes.
  // 1) Nouvelle structure __UNIVERSAL_DATA_FOR_REHYDRATION__
  if (state?.__DEFAULT_SCOPE__?.webapp?.pageProps?.dehydratedState?.queries) {
    const q = state.__DEFAULT_SCOPE__.webapp.pageProps.dehydratedState.queries;
    const node = q.find((x) =>
      JSON.stringify(x).includes("ItemModule") || JSON.stringify(x).includes("itemInfo")
    );
    const data = node?.state?.data ?? node?.state;
    if (data?.ItemModule) {
      // ItemModule keyed by video id
      const first = Object.values(data.ItemModule)[0];
      if (first?.stats) {
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
      const s = data.itemInfo.itemStruct.stats;
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
    const first = Object.values(state.ItemModule)[0];
    if (first?.stats) {
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

  return null;
}

function extractHashtags(text) {
  if (!text) return [];
  return Array.from(new Set((text.match(/#\w+/g) || []).map((t) => t.toLowerCase())));
}

export async function scrapeTikTokVideo(videoUrl) {
  if (!/^https?:\/\/(www\.)?tiktok\.com\//i.test(videoUrl)) {
    throw new Error("URL TikTok invalide.");
  }

  const resp = await fetch(videoUrl, { headers: HEADERS });
  if (!resp.ok) throw new Error("Impossible de charger la page TikTok.");
  const html = await resp.text();

  // Tente différents scripts connus
  const scripts = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);

  let stats = null;
  for (const s of scripts) {
    if (
      s.includes("__UNIVERSAL_DATA_FOR_REHYDRATION__") ||
      s.includes("SIGI_STATE") ||
      s.includes('"ItemModule"')
    ) {
      const json = extractFirstJson(s);
      if (json) {
        const picked = pickStatsFromState(json);
        if (picked) {
          stats = picked;
          break;
        }
      }
    }
  }

  if (!stats) throw new Error("Statistiques introuvables (page privée ou structure modifiée).");

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