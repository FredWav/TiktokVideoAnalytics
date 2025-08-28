// lib/tiktokScraper.js
// Scraping maison d'abord. Fallback ScrapingBee UNIQUEMENT en mode Pro.

import { getScrapingBeeKey, DIRECT_FETCH_HEADERS, config } from '@/lib/config';

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort('timeout'), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

async function fetchHTMLDirect(url, { timeoutMs } = {}) {
  const { signal, clear } = withTimeout(timeoutMs || config.scraping.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: DIRECT_FETCH_HEADERS,
      redirect: 'follow',
      signal,
    });
    if (!res.ok) throw new Error(`Direct fetch failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (!text || text.length < 1000) throw new Error('Direct fetch returned too little HTML.');
    return text;
  } finally {
    clear();
  }
}

async function fetchWithScrapingBee(url, { timeoutMs, countryCode } = {}) {
  const apiKey = getScrapingBeeKey();
  if (!apiKey) throw new Error('SCRAPINGBEE_API_KEY manquant.');

  const api = new URL('https://app.scrapingbee.com/api/v1/');
  api.searchParams.set('api_key', apiKey);
  api.searchParams.set('url', url);
  api.searchParams.set('render_js', 'false');
  api.searchParams.set('block_resources', 'true');
  api.searchParams.set('country_code', countryCode || config.scraping.countryCode);
  api.searchParams.set('wait', '0');

  const { signal, clear } = withTimeout(timeoutMs || config.scraping.timeoutMs);
  try {
    const res = await fetch(api, { method: 'GET', signal });
    if (!res.ok) throw new Error(`ScrapingBee failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (!text || text.length < 1000) throw new Error('ScrapingBee returned too little HTML.');
    return text;
  } finally {
    clear();
  }
}

/**
 * Récupère le HTML d'une page vidéo TikTok.
 * - Maison par défaut
 * - Fallback ScrapingBee uniquement si pro === true
 */
export async function getVideoHTML(videoUrl, { pro = false, timeoutMs } = {}) {
  try {
    return await fetchHTMLDirect(videoUrl, { timeoutMs });
  } catch (e1) {
    if (pro) {
      // Réservé au mode Pro
      return await fetchWithScrapingBee(videoUrl, { timeoutMs });
    }
    throw e1;
  }
}

/**
 * Récupère le HTML de la page profil @username.
 * - Maison par défaut
 * - Fallback ScrapingBee uniquement si pro === true
 */
export async function getProfileHTML(username, { pro = false, timeoutMs } = {}) {
  const url = `https://www.tiktok.com/@${username}`;
  try {
    return await fetchHTMLDirect(url, { timeoutMs });
  } catch (e1) {
    if (pro) {
      // Réservé au mode Pro
      return await fetchWithScrapingBee(url, { timeoutMs });
    }
    throw e1;
  }
}
