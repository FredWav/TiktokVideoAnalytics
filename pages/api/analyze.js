import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { url } = req.body;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Pour l’instant, on fait un test simple
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Tu es un expert en analyse de vidéos TikTok.",
      },
      {
        role: "user",
        content: `Analyse cette vidéo TikTok : ${url}`,
      },
    ],
  });

  res.status(200).json({ advice: completion.choices[0].message.content });
}
