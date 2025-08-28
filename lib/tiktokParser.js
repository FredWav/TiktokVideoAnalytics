// Parse TikTok profile HTML to extract basic metrics and recent video data.
// This is heuristic and may break if TikTok's structure changes frequently.
import cheerio from 'cheerio';
import logger from './logger.js';

const log = logger.child('[parser]');

export function parseProfile(html) {
  const $ = cheerio.load(html);

  // TikTok often embeds JSON in <script id="SIGI_STATE"> or similar. We attempt to locate first JSON object.
  let rawState;
  $('script').each((_, el) => {
    const txt = $(el).html();
    if (!txt) return;
    if (txt.includes('"UserModule"') && txt.includes('"StatsModule"')) {
      rawState = txt;
    }
  });

  let user = null;
  let stats = null;
  try {
    if (rawState) {
      // Extract JSON substring (crude approach)
      const match = rawState.match(/\{.*\}/s);
      if (match) {
        const json = JSON.parse(match[0]);
        // Heuristic pathing
        const userModule = json.UserModule?.users;
        const statsModule = json.UserModule?.stats || json.StatsModule;
        if (userModule) {
          user = Object.values(userModule)[0];
        }
        if (statsModule) {
          stats = Object.values(statsModule)[0];
        }
      }
    }
  } catch (e) {
    log.warn('Failed to parse embedded JSON', e);
  }

  // Fallback extraction heuristics
  const nickname = user?.nickname || $('h2[data-e2e="user-title"]').text() || null;
  const bio = user?.signature || $('[data-e2e="user-bio"]').text() || null;

  const followerCount = stats?.followerCount ?? numberFromText($('[data-e2e="followers-count"]').text());
  const followingCount = stats?.followingCount ?? numberFromText($('[data-e2e="following-count"]').text());
  const likeCount = stats?.heart ?? numberFromText($('[data-e2e="likes-count"]').text());

  // Video list could be dynamic; for static HTML may contain placeholders
  const videos = [];
  $('[div][data-e2e="user-post-item"] a[href*="/video/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;
    const idMatch = href.match(/video\/(\d+)/);
    if (!idMatch) return;
    videos.push({
      id: idMatch[1],
      url: href.startsWith('http') ? href : `https://www.tiktok.com${href}`
    });
  });

  return {
    user: {
      id: user?.id || null,
      uniqueId: user?.uniqueId || null,
      nickname,
      bio
    },
    stats: {
      followerCount,
      followingCount,
      likeCount
    },
    videos
  };
}

function numberFromText(txt) {
  if (!txt) return null;
  const cleaned = txt.trim();
  if (!cleaned) return null;
  // Handle shorthand like 1.2M, 3.4K
  const m = cleaned.match(/^([0-9,.]+)([KkMmBb])?$/);
  if (m) {
    let val = parseFloat(m[1].replace(/,/g, ''));
    const suffix = m[2]?.toUpperCase();
    if (suffix === 'K') val *= 1e3;
    else if (suffix === 'M') val *= 1e6;
    else if (suffix === 'B') val *= 1e9;
    return Math.round(val);
  }
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}