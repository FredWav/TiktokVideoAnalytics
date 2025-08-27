import React, { useState, useEffect } from "react";

function formatNumber(n) {
  if (n == null) return "—";
  if (n < 1000) return n;
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1000000).toFixed(2)}M`;
}
function formatDuration(s) {
  if (!s || isNaN(s)) return "—";
  const min = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${min}m${sec.toString().padStart(2, "0")}s`;
}
function getEngagementColor(rate) {
  if (rate > 10) return "viral";
  if (rate > 5) return "excellent";
  if (rate > 3) return "good";
  if (rate > 1) return "average";
  return "low";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("analyze");
  const [patterns, setPatterns] = useState(null);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState("Humour");

  const niches = [
    { value: "Humour", label: "Humour", icon: "😂" },
    { value: "Danse", label: "Danse", icon: "💃" },
    { value: "Beauté/Mode", label: "Beauté/Mode", icon: "💄" },
    { value: "Cuisine", label: "Cuisine", icon: "🍔" },
    { value: "Fitness/Sport", label: "Fitness/Sport", icon: "💪" },
    { value: "Éducation", label: "Éducation", icon: "📚" },
    { value: "Tech", label: "Tech", icon: "💻" },
    { value: "Gaming", label: "Gaming", icon: "🎮" },
    { value: "Musique", label: "Musique", icon: "🎵" },
    { value: "Lifestyle", label: "Lifestyle", icon: "✨" }
  ];

  useEffect(() => {
    if (activeTab === "patterns") {
      loadPatterns();
    }
  }, [activeTab, selectedNiche]);

  async function loadPatterns() {
    setLoadingPatterns(true);
    try {
      const response = await fetch(`/api/patterns?action=recent&niche=${selectedNiche}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setPatterns(data);
      } else {
        throw new Error(data.error || "Erreur API Patterns");
      }
    } catch (err) {
      setPatterns(null);
    }
    setLoadingPatterns(false);
  }

  async function handleAnalyze(tier = 'free') {
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tier }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Erreur inconnue");
      }
    } catch (err) {
      setError("Erreur réseau");
    }
  }

  return (
    <>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TikTok Analytics Pro</div>
            <div className="nav-tabs">
              <button className={`nav-tab ${activeTab === "analyze" ? "active" : ""}`} onClick={() => setActiveTab("analyze")}>Analyser</button>
              <button className={`nav-tab ${activeTab === "patterns" ? "active" : ""}`} onClick={() => setActiveTab("patterns")}>Patterns & Insights</button>
            </div>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Analyse <span className="highlight">TikTok</span> avec GPT-4o</h1>
            <p className="hero-subtitle">Obtenez des insights de niveau professionnel sur n'importe quelle vidéo.</p>

            {activeTab === "analyze" && (
              <div className="input-section">
                <div className="input-container">
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@username/video/..." className="url-input" />
                </div>
                <div className="analyze-buttons-container" style={{ marginBottom: "2rem" }}>
                  <button onClick={() => handleAnalyze('free')} className="analyze-btn free">Analyse Basique</button>
                  <button onClick={() => handleAnalyze('pro')} className="analyze-btn pro">✨ Analyse Pro (GPT-4o)</button>
                </div>
                {error && <div className="error-message">⚠️ {error}</div>}

                {result && (
                  <div className="results">
                    <div className="results-grid">
                      <div className="main-col">
                        {result.thumbnail && (
                          <div className="card thumbnail-card">
                            <img src={result.thumbnail} alt="Vidéo thumbnail" className="thumbnail-img" />
                            <div className="video-info">
                              <div className="username">@{result.username || "unknown"}</div>
                              <div className="niche-tag">{result.niche}</div>
                            </div>
                          </div>
                        )}
                        {result.description && (
                          <div className="card">
                            <h3 className="section-title">📝 Description</h3>
                            <p className="description-text">{result.description}</p>
                          </div>
                        )}
                        {(result.hashtags?.length > 0) && (
                          <div className="card">
                            <h3 className="section-title">Hashtags</h3>
                            <div className="hashtags-container">
                              {result.hashtags.map((tag, index) => (
                                <span key={index} className="hashtag-tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.analysis && (
                          <div className="card">
                            <h3 className="section-title">🔬 Analyse Détaillée</h3>
                            <ul className="ai-list">
                              <li><strong>Type de contenu :</strong> {result.analysis.contentType}</li>
                              <li><strong>Hook (Accroche) :</strong> {result.analysis.hookScore}/10</li>
                              <li><strong>CTA (Appel à l'action) :</strong> {result.analysis.ctaScore}/10</li>
                              <li><strong>Points forts :</strong> {result.analysis.viralFactors?.join(', ')}</li>
                              <li><strong>Points faibles :</strong> {result.analysis.weakPoints?.join(', ')}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="side-col">
                        {result.metrics && (
                          <div className="card performance-badge">
                            <div className="badge-label">Taux d'engagements</div>
                            <div className="engagement-table">
                              <div><strong>Global :</strong> {result.metrics.engagementRate.toFixed(1)}%</div>
                              <div><strong>Likes :</strong> {result.metrics.likeRate.toFixed(1)}%</div>
                              <div><strong>Commentaires :</strong> {result.metrics.commentRate.toFixed(1)}%</div>
                              <div><strong>Partages :</strong> {result.metrics.shareRate.toFixed(1)}%</div>
                              <div><strong>Saves :</strong> {result.metrics.saveRate.toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                        <div className="card stats-card-container">
                          <div className="stats-grid">
                            <div className="stat-card"><div>👁️</div><div>{formatNumber(result.stats?.views)}</div><div className="stat-label">Vues</div></div>
                            <div className="stat-card"><div>❤️</div><div>{formatNumber(result.stats?.likes)}</div><div className="stat-label">Likes</div></div>
                            <div className="stat-card"><div>💬</div><div>{formatNumber(result.stats?.comments)}</div><div className="stat-label">Comms</div></div>
                            <div className="stat-card"><div>📤</div><div>{formatNumber(result.stats?.shares)}</div><div className="stat-label">Partages</div></div>
                            <div className="stat-card"><div>📌</div><div>{formatNumber(result.stats?.saves)}</div><div className="stat-label">Saves</div></div>
                            <div className="stat-card"><div>⏱️</div><div>{formatDuration(result.stats?.duration)}</div><div className="stat-label">Durée</div></div>
                          </div>
                        </div>
                        {result.predictions && (
                          <div className="card">
                            <h3 className="section-title">🔮 Prédictions</h3>
                            <ul className="ai-list">
                              <li><strong>Potentiel Viral :</strong> {result.predictions.viralPotential}/10</li>
                              <li><strong>Vues Optimisées :</strong> {result.predictions.optimizedViews}</li>
                              <li><strong>Poster à :</strong> {result.predictions.bestPostTime}</li>
                              <li><strong>Fréquence :</strong> {result.predictions.optimalFrequency}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    {result.advice && (
                      <div className="card advice-card">
                        <h3 className="section-title">🎯 Recommandations Stratégiques</h3>
                        <div className="advice-list">
                          {Array.isArray(result.advice) ? result.advice.map((item, index) => (
                            <div key={index} className="advice-item">
                              <h4>{item.title}</h4>
                              <p>{item.details}</p>
                            </div>
                          )) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "patterns" && (
              <div className="patterns-section">
                <div className="patterns-header">
                  <h2>Patterns & Insights par Niche</h2>
                  <div className="niche-selector">
                    {niches.map(niche => (
                      <button
                        key={niche.value}
                        className={`niche-btn ${selectedNiche === niche.value ? 'active' : ''}`}
                        onClick={() => setSelectedNiche(niche.value)}
                      >
                        <span className="niche-icon">{niche.icon}</span>
                        <span className="niche-label">{niche.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {loadingPatterns ? (
                  <div className="loading-patterns">
                    <div className="spinner"></div>
                    <p>Analyse des patterns...</p>
                  </div>
                ) : patterns ? (
                  <div className="patterns-content">
                    {patterns.analysisCount === 0 ? (
                      <div className="card no-data-card">
                        <p>Aucune donnée disponible pour cette niche.</p>
                        <p>Analysez des vidéos en mode "Pro" pour alimenter ce dashboard !</p>
                      </div>
                    ) : (
                      <>
                        {patterns.aggregatedStats && (
                          <div className="card aggregated-stats">
                            <div className="agg-stat">
                              <div className="agg-value">{patterns.analysisCount}</div>
                              <div className="agg-label">Vidéos analysées</div>
                            </div>
                            <div className="agg-stat">
                              <div className="agg-value">{formatNumber(patterns.aggregatedStats.totalViews)}</div>
                              <div className="agg-label">Vues totales</div>
                            </div>
                            <div className="agg-stat">
                              <div className="agg-value">{patterns.aggregatedStats.avgEngagement?.toFixed(1) || 0}%</div>
                              <div className="agg-label">Engagement moyen</div>
                            </div>
                          </div>
                        )}
                        {patterns.recentAnalyses && patterns.recentAnalyses.length > 0 && (
                          <div className="card recent-analyses">
                            <h3>📊 Analyses récentes</h3>
                            <div className="analyses-list">
                              {patterns.recentAnalyses.map((analysis, i) => (
                                <div key={i} className="analysis-row">
                                  <span className="analysis-user">@{analysis.username}</span>
                                  <span className="analysis-views">{formatNumber(analysis.views)} vues</span>
                                  <span className={`analysis-engagement ${getEngagementColor(analysis.engagement)}`}>{analysis.engagement?.toFixed(1) || 0}%</span>
                                  <span className="analysis-time">{new Date(analysis.timestamp).toLocaleDateString('fr-FR')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="card no-data-card">
                    <p>Erreur lors du chargement des patterns.</p>
                  </div>
                )}
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
        .nav { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 10; }
        .nav-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; background: linear-gradient(90deg, #f472b6, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .nav-tabs { display: flex; gap: 1rem; }
        .nav-tab { background: transparent; border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 0.5rem 1.5rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; font-size: 0.9rem; font-weight: 500; }
        .nav-tab:hover { background: rgba(255, 255, 255, 0.1); }
        .nav-tab.active { background: linear-gradient(90deg, #ec4899, #9333ea); border-color: transparent; }
        .hero { max-width: 1200px; margin: 0 auto; padding: 3rem 1.5rem; }
        .hero-content { text-align: center; }
        .hero-title { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }
        .highlight { background: linear-gradient(90deg, #f472b6, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-subtitle { font-size: 1.25rem; opacity: 0.8; margin-bottom: 3rem; max-width: 700px; margin-left: auto; margin-right: auto; }
        .input-section { max-width: 700px; margin: 0 auto 3rem; }
        .input-container { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 1rem; }
        .url-input { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.75rem; padding: 0.75rem 1rem; color: white; font-size: 1rem; outline: none; transition: all 0.3s; }
        .analyze-buttons-container { display: flex; gap: 1rem; margin-top: 1rem; margin-bottom: 2rem; }
        .analyze-btn { border: none; border-radius: 0.75rem; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; justify-content: center; flex: 1; font-size: 1rem; }
        .analyze-btn.free { background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); color: white; }
        .analyze-btn.free:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
        .analyze-btn.pro { background: linear-gradient(90deg, #ec4899, #9333ea); color: white; border: none; }
        .analyze-btn.pro:hover:not(:disabled) { background: linear-gradient(90deg, #f472b6, #c084fc); }
        .spinner { border: 3px solid #e0e7ff; border-top: 3px solid #9333ea; border-radius: 50%; width: 1.5rem; height: 1.5rem; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .error-message { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 0.5rem; padding: 0.75rem; color: #fecaca; margin-top: 1rem; }
        .results { max-width: 1200px; margin: 0 auto; }
        .results-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2.5rem; align-items: flex-start; margin-bottom: 2.5rem; }
        .main-col, .side-col { display: flex; flex-direction: column; gap: 2rem; }
        .card, .thumbnail-card, .performance-badge, .stats-card-container { margin-bottom: 0 !important; }
        .card { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(15px); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.15); }
        .thumbnail-card { text-align: center; }
        .thumbnail-img { max-width: 100%; max-height: 400px; border-radius: 0.75rem; margin: 0 auto 1rem; display: block; }
        .video-info { text-align: center; }
        .username { font-size: 1.25rem; font-weight: 600; color: #c084fc; margin-bottom: 0.5rem; }
        .niche-tag { display: inline-block; background: linear-gradient(90deg, #ec4899, #9333ea); padding: 0.25rem 1rem; border-radius: 9999px; font-size: 0.875rem; }
        .performance-badge { text-align: left; }
        .performance-badge .badge-label { font-size: 1rem; opacity: 0.8; margin-bottom: 0.5rem; text-align: left; }
        .performance-badge .engagement-table { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.7rem; font-size: 1.1rem; text-align: left; align-items: flex-start; }
        .stats-card-container { padding: 1rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .stat-card { background: rgba(255, 255, 255, 0.1); border-radius: 0.75rem; padding: 1rem; text-align: center; font-size: 1.25rem; font-weight: bold; }
        .stat-label { font-size: 0.75rem; opacity: 0.75; font-weight: normal; margin-top: 0.25rem; }
        .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; text-align: center; }
        .hashtags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        .hashtag-tag { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; }
        .description-text, .ai-list { white-space: pre-wrap; line-height: 1.6; opacity: 0.9; text-align: left; }
        .ai-list { list-style: none; padding: 0; text-align: left; }
        .ai-list li { margin-bottom: 0.75rem; }
        .ai-list li strong { color: #c084fc; }
        .advice-card { grid-column: 1 / -1; }
        .advice-list .advice-item { margin-bottom: 1.25rem; padding-left: 1rem; border-left: 2px solid #ec4899; }
        .advice-list .advice-item h4 { color: #f472b6; margin-bottom: 0.25rem; }
        .advice-list .advice-item p { opacity: 0.9; text-align: left;}
        .patterns-section { max-width: 1400px; margin: 0 auto; padding: 3rem 1.5rem; }
        .patterns-header { text-align: center; margin-bottom: 3rem; }
        .patterns-header h2 { font-size: 2.5rem; margin-bottom: 2rem; }
        .niche-selector { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        .niche-btn { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 0.5rem; padding: 0.5rem 1rem; color: white; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; }
        .niche-btn:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }
        .niche-btn.active { background: linear-gradient(90deg, #ec4899, #9333ea); border-color: transparent; }
        .niche-icon { font-size: 1.25rem; }
        .niche-label { font-size: 0.875rem; }
        .loading-patterns { text-align: center; padding: 4rem; }
        .loading-patterns .spinner { width: 3rem; height: 3rem; margin: 0 auto 1rem; }
        .patterns-content { display: grid; gap: 2rem; }
        .aggregated-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .agg-stat { text-align: center; }
        .agg-value { font-size: 2rem; font-weight: bold; color: #f472b6; margin-bottom: 0.5rem; }
        .agg-label { font-size: 0.875rem; opacity: 0.7; }
        .recent-analyses h3 { margin-bottom: 1.5rem; text-align: center; }
        .analyses-list { display: grid; gap: 0.75rem; }
        .analysis-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 0.5rem; font-size: 0.9rem; }
        .analysis-user { font-weight: 600; color: #c084fc; }
        .analysis-engagement.viral { color: #f472b6; }
        .analysis-engagement.excellent { color: #4ade80; }
        .analysis-engagement.good { color: #60a5fa; }
        .analysis-engagement.average { color: #fbbf24; }
        .analysis-engagement.low { color: #f87171; }
        .analysis-time { opacity: 0.7; text-align: right; }
        .no-data-card { text-align: center; }
        .no-data-card p { margin-bottom: 1rem; opacity: 0.8; }
        @media (max-width: 900px) { .results-grid { grid-template-columns: 1fr; gap: 2rem; } }
        @media (max-width: 768px) { .hero-title { font-size: 2rem; } .nav-content { flex-direction: column; gap: 1rem; } }
        @media (max-width: 768px) { .hero-title { font-size: 2rem; } .nav-content { flex-direction: column; gap: 1rem; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .analysis-row { grid-template-columns: 1fr; gap: 0.5rem; text-align: center; } .analysis-time { text-align: center; } }
      `}</style>
    </>
  );
}
