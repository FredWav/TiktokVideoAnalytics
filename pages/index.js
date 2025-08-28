import React, { useState, useEffect } from "react";
import Image from "next/image";

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
  const [loading, setLoading] = useState(false);
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

    if (activeTab === "patterns") {
      loadPatterns();
    }
  }, [activeTab, selectedNiche]);

  async function handleAnalyze(tier = 'free') {
    setError("");
    setResult(null);
    setLoading(true);
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
    setLoading(false);
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
            <p className="hero-subtitle">Obtenez des insights de niveau professionnel sur n&apos;importe quelle vidéo.</p>

            {activeTab === "analyze" && (
              <div className="input-section">
                <div className="input-container">
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@username/video/..." className="url-input" />
                </div>
                <div className="analyze-buttons-container">
                  <button onClick={() => handleAnalyze('free')} disabled={loading} className="analyze-btn free">{loading ? <div className="spinner"></div> : 'Analyse Basique'}</button>
                  <button onClick={() => handleAnalyze('pro')} disabled={loading} className="analyze-btn pro">{loading ? <div className="spinner"></div> : '✨ Analyse Pro (GPT-4o)'}</button>
                </div>
                {error && <div className="error-message">⚠️ {error}</div>}

                {result && (
                  <div className="results">
                    <div className="results-grid">
                      <div className="main-col">
                        {result.thumbnail && (
                          <div className="card thumbnail-card">
                            <Image src={result.thumbnail} alt="Vidéo thumbnail" className="thumbnail-img" width={320} height={180} />
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
                              <li><strong>CTA (Appel à l&apos;action) :</strong> {result.analysis.ctaScore}/10</li>
                              <li><strong>Points forts :</strong> {result.analysis.viralFactors?.join(', ')}</li>
                              <li><strong>Points faibles :</strong> {result.analysis.weakPoints?.join(', ')}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="side-col">
                        {result.metrics && (
                          <div className="card performance-badge">
                            <div className="badge-label">Taux d&apos;engagements</div>
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
                        <p>Analysez des vidéos en mode &quot;Pro&quot; pour alimenter ce dashboard !</p>
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
    </>
  );
}
