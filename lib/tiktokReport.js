// lib/tiktokReport.js
// Rapport IA UNIQUEMENT en mode Pro, via GPT-4.1 (paramétrable)

import {
  OPENAI_MODEL,
  OPENAI_MAX_TOKENS,
  OPENAI_TEMPERATURE,
  config,
  getOpenAIKey,
} from '@/lib/config';

export async function buildAIReport(input, derived, { pro = false } = {}) {
  if (!pro || !config.ai.enabled) return null;

  const key = getOpenAIKey();
  if (!key) return null;

  const messages = [
    {
      role: 'system',
      content:
        'Tu es un analyste TikTok senior. Donne un rapport concis, actionnable, sans remplissage. Réponds en français.',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          type: input?.user ? 'account' : 'video',
          input,
          derived,
        },
        null,
        2
      ),
    },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL, // gpt-4.1 par défaut
      messages,
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: OPENAI_TEMPERATURE,
    }),
  });

  if (!res.ok) {
    // On ne casse pas l’API si l’IA échoue : on renvoie simplement null
    try {
      const txt = await res.text();
      console.warn('[AI] OpenAI error:', res.status, txt);
    } catch (_) {}
    return null;
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}
