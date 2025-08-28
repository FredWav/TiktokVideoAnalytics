// Fetch TikTok profile HTML (public) with optional ScrapingBee usage.
// IMPORTANT: Scraping / automated access to TikTok may violate their Terms of Service.
// Use responsibly, with user consent, and consider legal / compliance constraints.
import { config } from './config.js';
import { randomUserAgent } from './userAgents.js';
import logger from './logger.js';
import axios from 'axios';

const log = logger.child('[scraper]');

async function fetchViaScrapingBee(url) {
  if (!config.scrapingBeeApiKey) {
    throw new Error('SCRAPINGBEE_API_KEY not configured');
  }
  const params = {
    api_key: config.scrapingBeeApiKey,
    url,
    block_resources: false,
    premium_proxy: 'true',
    render_js: 'false'
  };
  const query = new URLSearchParams(params).toString();
  const endpoint = `https://app.scrapingbee.com/api/v1/?${query}`;
  const res = await axios.get(endpoint, {
    timeout: config.scraping.timeoutMs,
    headers: { 'User-Agent': randomUserAgent() }
  });
  return res.data;
}

async function fetchDirect(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUserAgent(),
      'Accept-Language': 'en-US,en;q=0.9'
    },
    redirect: 'follow'
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}`);
  }
  return await res.text();
}

export async function getProfileHTML(username) {
  if (!/^[A-Za-z0-9._]{2,32}$/.test(username)) {
    throw new Error('Invalid username format');
  }
  const url = `https://www.tiktok.com/@${username}`;
  log.debug('Fetching profile', { username, via: config.scraping.useScrapingBee ? 'scrapingbee' : 'direct' });
  return config.scraping.useScrapingBee ? fetchViaScrapingBee(url) : fetchDirect(url);
}