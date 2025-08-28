// lib/tiktokParser.js
// Extraction et parsing de SIGI_STATE (profil + vidéo)

function extractSIGI(html) {
  const m =
    html.match(/<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/i) ||
    html.match(/window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?})\s*;<\/script>/i);

  if (!m || !m[1]) throw new Error('SIGI_STATE introuvable.');
  const raw = m[1].trim();

  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/<\/?script>/gi, '');
    return JSON.parse(cleaned);
  }
}

export function parseVideo(html) {
  const sigi = extractSIGI(html);
  const items = sigi?.ItemModule || {};
  const videoIds = Object.keys(items);
  if (!videoIds.length) throw new Error('Aucune vidéo trouvée dans ItemModule.');

  const vid = items[videoIds[0]];
  return {
    id: vid?.id || null,
    desc: vid?.desc || '',
    createTime: vid?.createTime ? Number(vid.createTime) : null,
    stats: {
      playCount: Number(vid?.stats?.playCount ?? 0),
      diggCount: Number(vid?.stats?.diggCount ?? 0),
      shareCount: Number(vid?.stats?.shareCount ?? 0),
      commentCount: Number(vid?.stats?.commentCount ?? 0),
    },
    author: {
      uniqueId: vid?.author || null,
      nickname: sigi?.UserModule?.users?.[vid?.author || '']?.nickname || null,
    },
    music: {
      title: vid?.music?.title || null,
      authorName: vid?.music?.authorName || null,
    },
  };
}

export function parseProfile(html) {
  const sigi = extractSIGI(html);
  const users = sigi?.UserModule?.users || {};
  const stats = sigi?.UserModule?.stats || {};
  const uniqueId = Object.keys(users)[0];
  const user = users[uniqueId] || null;
  const userStats = uniqueId ? stats[uniqueId] : null;

  const itemModule = sigi?.ItemModule || {};
  const videos = Object.values(itemModule).map((v) => ({
    id: v?.id || null,
    desc: v?.desc || '',
    stats: {
      playCount: Number(v?.stats?.playCount ?? 0),
      diggCount: Number(v?.stats?.diggCount ?? 0),
      shareCount: Number(v?.stats?.shareCount ?? 0),
      commentCount: Number(v?.stats?.commentCount ?? 0),
    },
    createTime: v?.createTime ? Number(v.createTime) : null,
  }));

  return {
    user: {
      uniqueId: user?.uniqueId || uniqueId || null,
      nickname: user?.nickname || null,
      bio: user?.signature || null,
    },
    stats: {
      followerCount: Number(userStats?.followerCount ?? 0),
      followingCount: Number(userStats?.followingCount ?? 0),
      likeCount: Number(userStats?.heart ?? 0),
      videoCount: Number(userStats?.videoCount ?? videos.length || 0),
    },
    videos,
  };
}

export function deriveStats(parsed) {
  const f = Number(parsed?.stats?.followerCount ?? 0);
  const g = Number(parsed?.stats?.followingCount ?? 0);
  const ratio = g > 0 ? f / g : null;

  return {
    videoCount: Number(parsed?.stats?.videoCount ?? parsed?.videos?.length ?? 0),
    followerToFollowingRatio: ratio,
  };
}
