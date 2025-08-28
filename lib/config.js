// lib/config.js
// Centralized configuration for scraping + AI (Pro) with robust parsing.
// Safe to import from API routes (Node/Edge). No hard throws at import time.

function parseBool(val, def = false) {
  if (val === undefined || val === null) return def;
  const s = String(val).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function parseIntSafe(val, def) {
  const n = parseInt(String(val ?? '').trim(), 10);
  return Number.isFinite(n) ? n : def;
}

function nonEmpty(val) {
  const s = (val ?? '').toString().trim();
  return s.length ? s : '';
}

// --- Environment detection
const NODE_ENV = nonEmpty(process.env.NODE_ENV) || 'development';
const IS_PROD = NODE_ENV === 'production';
const IS_DEV = !IS_PROD;
const IS_VERCEL = !!process.env.VERCEL;
const VERCEL_REGION = nonEmpty(process.env.VERCEL_REGION) || 'unknown';

// --- Feature toggles & defaults
const AI_ENABLED = parseBool(process.env.AI_REPORT_ENABLED, true);
// Default model (Fred: gpt-4.1 partout)
const AI_MODEL = nonEmpty(process.env.OPENAI_MODEL) || 'gpt-4.1';
const AI_MAX_TOKENS = parseIntSafe(process.env.OPENAI_MAX_TOKENS, 900);
const AI_TEMPERATURE = parseIntSafe(process.env.OPENAI_TEMPERATURE, 0.2);

const USE_SCRAPINGBEE = parseBool(process.env.USE_SCRAPINGBEE, false);
const SCRAPE_TIMEOUT_MS = parseIntSafe(process.env.SCRAPE_TIMEOUT_MS, 15000);
const SCRAPE_COUNTRY = nonEmpty(process.env.SCRAPE_COUNTRY_CODE) || 'fr';

const CACHE_TTL_SECONDS = parseIntSafe(process.env.CACHE_TTL_SECONDS, 900); // 15 min
const CACHE_MAX_ITEMS = parseIntSafe(process.env.CACHE_MAX_ITEMS, 200);

const RL_WINDOW_MS = parseIntSafe(process.env.RATE_LIMIT_WINDOW_MS, 60000);
const RL_MAX = parseIntSafe(process.env.RATE_LIMIT_MAX, 30);

const LOG_LEVEL = nonEmpty(process.env.LOG_LEVEL) || 'info';

// --- Secrets
const OPENAI_API_KEY = nonEmpty(process.env.OPENAI_API_KEY);
const SCRAPINGBEE_API_KEY = nonEmpty(process.env.SCRAPINGBEE_API_KEY);

// --- Strong UA for direct scraping (SIGI_STATE)
const DIRECT_FETCH_HEADERS = Object.freeze({
  'user-agent':
    nonEmpty(process.env.SCRAPE_USER_AGENT) ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
  'accept-language':
    nonEmpty(process.env.SCRAPE_ACCEPT_LANGUAGE) || 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'upgrade-insecure-requests': '1',
});

// --- Config object (frozen)
export const config = Object.freeze({
  env: Object.freeze({
    nodeEnv: NODE_ENV,
    isProd: IS_PROD,
    isDev: IS_DEV,
    vercel: Object.freeze({
      isVercel: IS_VERCEL,
      region: VERCEL_REGION,
    }),
    logLevel: LOG_LEVEL,
  }),
  ai: Object.freeze({
    enabled: AI_ENABLED,
    model: AI_MODEL,
    maxTokens: AI_MAX_TOKENS,
    temperature: AI_TEMPERATURE,
    // key intentionally not exposed here to avoid accidental logging
  }),
  scraping: Object.freeze({
    useScrapingBee: USE_SCRAPINGBEE,
    timeoutMs: SCRAPE_TIMEOUT_MS,
    countryCode: SCRAPE_COUNTRY,
    headers: DIRECT_FETCH_HEADERS,
  }),
  cache: Object.freeze({
    ttlSeconds: CACHE_TTL_SECONDS,
    maxItems: CACHE_MAX_ITEMS,
  }),
  rateLimit: Object.freeze({
    windowMs: RL_WINDOW_MS,
    max: RL_MAX,
  }),
  keys: Object.freeze({
    openAI: !!OPENAI_API_KEY,
    scrapingBee: !!SCRAPINGBEE_API_KEY,
  }),
});

// --- Optional runtime validation (call inside API handlers, not at import)
export function validateRuntime({ pro = false } = {}) {
  const warnings = [];

  if (config.ai.enabled && pro && !OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY manquant alors que AI_REPORT_ENABLED=on et requête Pro.');
  }
  if ((config.scraping.useScrapingBee || pro) && !SCRAPINGBEE_API_KEY) {
    // On autorise fallback direct, mais on prévient si on voulait ScrapingBee
    warnings.push('SCRAPINGBEE_API_KEY manquant (ScrapingBee activé ou requête Pro).');
  }
  if (warnings.length) {
    console.warn('[config.validateRuntime] ' + warnings.join(' | '));
  }

  return {
    ok: warnings.length === 0,
    warnings,
  };
}

// --- Backward-compatible named exports (so existing imports keep working)
export const OPENAI_MODEL = AI_MODEL;
export const OPENAI_MAX_TOKENS = AI_MAX_TOKENS;
export const OPENAI_TEMPERATURE = AI_TEMPERATURE;
export { SCRAPINGBEE_API_KEY, DIRECT_FETCH_HEADERS };

// Also export flags for convenience
export const AI_REPORT_ENABLED = AI_ENABLED;
export const USE_BEE = USE_SCRAPINGBEE;

// Export raw keys ONLY if you really need them in callers (avoid logging!)
export function getOpenAIKey() {
  return OPENAI_API_KEY;
}
export function getScrapingBeeKey() {
  return SCRAPINGBEE_API_KEY;
}

// Default export (if you prefer `import config from '@/lib/config'`)
export default config;
