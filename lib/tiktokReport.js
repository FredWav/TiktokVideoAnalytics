// Generate an analytical natural-language report using OpenAI (optional)
import { config } from './config.js';
import OpenAI from 'openai';

let client;
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: config.openAIKey });
  }
  return client;
}

export async function buildAIReport(parsed, derived) {
  if (!config.ai.enabled) return null;
  if (!config.openAIKey) return null;

  const prompt = `
You are an analyst. Summarize the TikTok account metrics:

User:
- Nickname: ${parsed.user.nickname}
- Bio: ${parsed.user.bio}

Primary Stats:
- Followers: ${parsed.stats.followerCount}
- Following: ${parsed.stats.followingCount}
- Likes (total): ${parsed.stats.likeCount}
- Videos scraped: ${parsed.videos.length}

Derived:
- Follower/Following Ratio: ${derived.followerToFollowingRatio}
- Video Count: ${derived.videoCount}

Provide:
1. High-level overview (1 paragraph)
2. Growth / engagement inferences (bullet list)
3. Recommended next actions (bullet list)
Keep it concise.
`;

  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: config.ai.model,
    messages: [
      { role: 'system', content: 'You are a concise social media analyst.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4
  });

  return completion.choices[0]?.message?.content?.trim() || null;
}