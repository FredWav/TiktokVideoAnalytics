import { useState, useEffect } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("analyze");

  async function handleAnalyze(tier = 'free') {
    setError("");
    setResult(null);
    if (!url) {
      setError("Veuillez entrer une URL TikTok valide.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur inconnue");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const getEngagementColor = (rate) => {
    if (rate > 10) return "viral"; if (rate > 5) return "excellent"; if (rate > 3) return "good"; if (rate > 1) return "average"; return "low";
  };
  
  return (
    <>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TikTok Analytics Pro</div>
            {/* On peut remettre les tabs plus tard si tu veux */}
          </div>
        </nav>

        <div className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Analyse <span className="highlight">TikTok</span> avec GPT-4o</h1>
            <p className="hero-subtitle">Obtenez des insights de niveau professionnel sur n'importe quelle vidéo.</p>

            <div className="input-section">
              <div className="input-container">
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@username/video/..." className="url-input" />
              </div>
              <div className="analyze-buttons-container">
                <button onClick={() => handleAnalyze('free')} disabled={loading} className="analyze-btn free">{loading ? <div className="spinner"></div> : 'Analyse Basique'}</button>
                <button onClick={() => handleAnalyze('pro')} disabled={loading} className="analyze-btn pro">{loading ? <div className="spinner"></div> : '✨ Analyse Pro (GPT-4o)'}</button>
              </div>
              {error && <div className="error-message">⚠️ {error}</div>}
            </div>

            {result && (
              <div className="results">
                <div className="results-grid">
                  <div className="main-col">
                    {result.thumbnail && <div className="thumbnail-card"><img src={result.thumbnail} alt="Vidéo thumbnail" className="thumbnail-img"/><div className="video-info"><div className="username">@{result.username || "unknown"}</div><div className="niche-tag">{result.niche}</div></div></div>}
                    {result.description && <div className="card"><h3 className="section-title">📝 Description</h3><p className="description-text">{result.description}</p></div>}
                    {(result.hashtags?.length > 0) && <div className="card"><h3 className="section-title">Hashtags</h3><div className="hashtags-container">{result.hashtags.map((tag, index) => <span key={index} className="hashtag-tag">{tag}</span>)}</div></div>}
                    {result.analysis && <div className="card"><h3 className="section-title">🔬 Analyse Détaillée</h3><ul className="ai-list"><li><strong>Type de contenu :</strong> {result.analysis.contentType}</li><li><strong>Hook (Accroche) :</strong> {result.analysis.hookScore}/10</li><li><strong>CTA (Appel à l'action) :</strong> {result.analysis.ctaScore}/10</li><li><strong>Points forts :</strong> {result.analysis.viralFactors?.join(', ')}</li><li><strong>Points faibles :</strong> {result.analysis.weakPoints?.join(', ')}</li></ul></div>}
                  </div>
                  <div className="side-col">
                    {result.metrics?.performanceLevel && <div className={`performance-badge ${getEngagementColor(result.metrics.engagementRate)}`}><div className="badge-label">Performance</div><div className="badge-value">{result.metrics.performanceLevel}</div><div className="badge-rate">{(result.metrics.engagementRate || 0).toFixed(1)}% d'engagement</div></div>}
                    <div className="stats-grid">
                      <div className="stat-card"><div>👁️</div><div>{formatNumber(result.stats?.views)}</div><div className="stat-label">Vues</div></div>
                      <div className="stat-card"><div>❤️</div><div>{formatNumber(result.stats?.likes)}</div><div className="stat-label">Likes</div></div>
                      <div className="stat-card"><div>💬</div><div>{formatNumber(result.stats?.comments)}</div><div className="stat-label">Comms</div></div>
                      <div className="stat-card"><div>📤</div><div>{formatNumber(result.stats?.shares)}</div><div className="stat-label">Partages</div></div>
                      <div className="stat-card"><div>📌</div><div>{formatNumber(result.stats?.saves)}</div><div className="stat-label">Saves</div></div>
                      <div className="stat-card"><div>⏱️</div><div>{formatDuration(result.stats?.duration)}</div><div className="stat-label">Durée</div></div>
                    </div>
                    {result.predictions && <div className="card"><h3 className="section-title">🔮 Prédictions</h3><ul className="ai-list"><li><strong>Potentiel Viral :</strong> {result.predictions.viralPotential}/10</li><li><strong>Vues Optimisées :</strong> {result.predictions.optimizedViews}</li><li><strong>Poster à :</strong> {result.predictions.bestPostTime}</li><li><strong>Fréquence :</strong> {result.predictions.optimalFrequency}</li></ul></div>}
                  </div>
                </div>
                {result.advice && <div className="card advice-card"><h3 className="section-title">🎯 Recommandations Stratégiques</h3><div className="advice-list">{result.advice.map((item, index) => <div key={index} className="advice-item"><h4>{item.title}</h4><p>{item.details}</p></div>)}</div></div>}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .app { min-height: 100vh; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 74%, #4c1d95 100%); color: white; }
        .nav { padding: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .nav-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; background: linear-gradient(90deg, #f472b6, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero { max-width: 1200px; margin: 0 auto; padding: 3rem 1.5rem; }
        .hero-content { text-align: center; }
        .hero-title { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }
        .highlight { background: linear-gradient(90deg, #f472b6, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.8; margin-bottom: 3rem; }
        .input-section { max-width: 700px; margin: 0 auto 3rem; }
        .input-container { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 1rem; }
        .url-input { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.75rem; padding: 0.75rem 1rem; color: white; font-size: 1rem; outline: none; transition: all 0.3s; }
        .analyze-buttons-container { display: flex; gap: 1rem; }
        .analyze-btn { border: none; border-radius: 0.75rem; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; justify-content: center; flex: 1; font-size: 1rem; }
        .analyze-btn.free { background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); color: white; }
        .analyze-btn.free:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
        .analyze-btn.pro { background: linear-gradient(90deg, #ec4899, #9333ea); color: white; }
        .analyze-btn.pro:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner { width: 1rem; height: 1rem; border: 2px solid rgba(255, 255, 255, 0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .error-message { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 0.5rem; padding: 0.75rem; color: #fecaca; margin-top: 1rem; }
        .results { max-width: 1200px; margin: 0 auto; }
        .results-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; align-items: start; }
        .main-col, .side-col { display: grid; gap: 2rem; }
        .card, .thumbnail-card, .performance-badge { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(15px); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.15); }
        .thumbnail-img { max-width: 100%; border-radius: 0.75rem; margin-bottom: 1rem; display: block; }
        .video-info { text-align: center; }
        .username { font-size: 1.25rem; font-weight: 600; color: #c084fc; margin-bottom: 0.5rem; }
        .niche-tag { display: inline-block; background: linear-gradient(90deg, #ec4899, #9333ea); padding: 0.25rem 1rem; border-radius: 9999px; font-size: 0.875rem; }
        .performance-badge { text-align: center; }
        .performance-badge.viral { border-color: #f472b6; } .performance-badge.excellent { border-color: #4ade80; } .performance-badge.good { border-color: #60a5fa; } .performance-badge.average { border-color: #fbbf24; } .performance-badge.low { border-color: #f87171; }
        .badge-label { font-size: 0.875rem; opacity: 0.7; margin-bottom: 0.5rem; }
        .badge-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .badge-rate { font-size: 1rem; opacity: 0.9; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .stat-card { background: rgba(255, 255, 255, 0.1); border-radius: 0.75rem; padding: 1rem; text-align: center; font-size: 1.25rem; font-weight: bold; }
        .stat-label { font-size: 0.75rem; opacity: 0.75; font-weight: normal; margin-top: 0.25rem; }
        .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; text-align: center; }
        .hashtags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        .hashtag-tag { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; }
        .description-text, .ai-list { white-space: pre-wrap; line-height: 1.6; opacity: 0.9; text-align: left; }
        .ai-list { list-style: none; padding: 0; } .ai-list li { margin-bottom: 0.5rem; } .ai-list li strong { color: #c084fc; }
        .advice-card { grid-column: 1 / -1; }
        .advice-list .advice-item { margin-bottom: 1rem; }
        .advice-list .advice-item h4 { color: #f472b6; margin-bottom: 0.25rem; }
        .advice-list .advice-item p { opacity: 0.9; }
        @media (max-width: 900px) { .results-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .hero-title { font-size: 2rem; } .nav-content { flex-direction: column; gap: 1rem; } }
      `}</style>
    </>
  );
}
