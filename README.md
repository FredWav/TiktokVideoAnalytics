# TikTok Video Analytics (Prototype)

This project provides a simple Next.js-based endpoint and UI for analyzing a public TikTok account's basic metrics and producing an optional AI-generated summary.

> DISCLAIMER: Automated scraping of TikTok may violate TikTok's Terms of Service. This code is for educational / internal prototype purposes. Use at your own risk, ensure legal and compliance review, and respect robots, rate limits, and user privacy.

## Features

- Public profile HTML fetch (direct or via ScrapingBee)
- Heuristic parsing (followers, following, likes, videos discovered)
- Derived metrics (follower/following ratio, etc.)
- Optional AI summary via OpenAI
- In-memory TTL cache
- Simple IP-based rate limiting
- Basic web form UI
- Linting + formatting tooling

## Getting Started

1. Clone repository
2. Install dependencies:
   ```bash
   pnpm install # or npm install / yarn
   ```
3. Copy env example:
   ```bash
   cp .env.example .env.local
   ```
4. Populate variables (at least `OPENAI_API_KEY` if you want AI report).
5. Run dev server:
   ```bash
   pnpm dev
   ```
6. Open http://localhost:3000/tiktok-account-analysis

## API

POST `/api/tiktok-analyze`

Body:
```json
{
  "username": "someuser",
  "forceRefresh": false
}
```

Response:
```json
{
  "cached": false,
  "username": "someuser",
  "parsed": { "user": {}, "stats": {}, "videos": [] },
  "derived": {},
  "aiReport": "…",
  "generatedAt": "2025-08-28T00:00:00.000Z",
  "rateLimit": { "allowed": true, "remaining": 29 }
}
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| OPENAI_API_KEY | OpenAI key for AI summaries |
| SCRAPINGBEE_API_KEY | ScrapingBee key (optional) |
| USE_SCRAPINGBEE | Set true to route traffic via ScrapingBee |
| CACHE_TTL_SECONDS | TTL for cached profile results |
| RATE_LIMIT_MAX | Max requests per window (IP) |

## Architecture Overview

```
pages/api/tiktok-analyze.js
  -> rateLimit -> cache (hit?)
    -> tiktokScraper (direct or ScrapingBee)
      -> tiktokParser (HTML -> structured data)
      -> tiktokStats (derive secondary metrics)
      -> tiktokReport (OpenAI summary)
    -> cache set -> JSON response
```

`lib/` modules are intentionally small and composable.

## Extending

- Add per-video scraping & metrics
- Persist cache using an external KV or Redis
- Add TypeScript + strict schemas (zod)
- Add user authentication, usage quotas
- Add trending hashtag or sound analysis

## Quality

Run lint: `pnpm lint`  
Run format: `pnpm format`

## License

(Choose a license; currently unlicensed - add one if distributing.)
