import { rateLimitCheck } from '../../lib/rateLimit.js';
import cache from '../../lib/cache.js';
import { getProfileHTML } from '../../lib/tiktokScraper.js';
import { parseProfile } from '../../lib/tiktokParser.js';
import { deriveStats } from '../../lib/tiktokStats.js';
import { buildAIReport } from '../../lib/tiktokReport.js';
import logger from '../../lib/logger.js';

export const config = {
  maxDuration: 15
};

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, forceRefresh } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  const rl = rateLimitCheck(ip);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: rl.retryAfterMs });
  }

  const cacheKey = `profile:${username.toLowerCase()}`;
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({ cached: true, ...cached, rateLimit: rl });
    }
  }

  try {
    const html = await getProfileHTML(username);
    const parsed = parseProfile(html);
    const derived = deriveStats(parsed);
    const aiReport = await buildAIReport(parsed, derived);

    const result = {
      username,
      parsed,
      derived,
      aiReport,
      generatedAt: new Date().toISOString()
    };
    cache.set(cacheKey, result);
    return res.status(200).json({ cached: false, ...result, rateLimit: rl });
  } catch (e) {
    logger.error('[api] failure', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}