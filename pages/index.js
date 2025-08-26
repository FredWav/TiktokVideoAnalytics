import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");

  async function handleAnalyze() {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setResult(data.advice);
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Analyse TikTok</h1>
      <input
        type="text"
        placeholder="Colle l’URL de ta vidéo TikTok"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "300px", marginRight: "1rem" }}
      />
      <button onClick={handleAnalyze}>Analyser</button>

      {result && (
        <div style={{ marginTop: "2rem", whiteSpace: "pre-line" }}>
          <h2>Conseils :</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}
