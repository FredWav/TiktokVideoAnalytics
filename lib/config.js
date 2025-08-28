// Centralized configuration and environment variable loading
// Keep this file lightweight – it can be imported both server and edge if needed.

export const REQUIRED_ENV = [
  'OPENAI_API_KEY'
];

function missing(vars) {
  if (vars.length === 0) return;
  console.warn('[config] Missing environment variables:', vars.join(', '));
}

const collectedMissing = REQUIRED_ENV.filter(k => !process.env[k]);
missing(collectedMissing);

export const config = {
  openAIKey: process.env.OPENAI_API_KEY || '',
  scrapingBeeApiKey: process.env.SCRAPINGBEE_API_KEY || '',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '900', 10), // 15 min default
  maxCachedItems: parseInt(process.env.CACHE_MAX_ITEMS || '200', 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10)
  },
  scraping: {
    useScrapingBee: process.env.USE_SCRAPINGBEE === '1' || process.env.USE_SCRAPINGBEE === 'true',
    timeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '15000', 10)
  },
  ai: {
    enabled: process.env.AI_REPORT_ENABLED !== '0',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }
};

export default config;