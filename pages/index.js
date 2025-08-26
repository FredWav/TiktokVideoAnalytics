import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
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
        body: JSON.stringify({ url }),
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
    if (num === undefined || num === null) return 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <>
      <div className="app">
        {/* Navigation */}
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TikTok Analytics</div>
            <div className="nav-subtitle">Analysez vos performances</div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Analysez vos vidéos <span className="highlight">TikTok</span>
            </h1>
            <p className="hero-subtitle">
              Obtenez des insights détaillés sur vos performances, taux d'engagement 
              et recommandations personnalisées powered by IA.
            </p>

            {/* Input Section */}
            <div className="input-section">
              <div className="input-container">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Collez votre URL TikTok ici..."
                  className="url-input"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="analyze-btn"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Analyse...</span>
                    </>
                  ) : (
                    "Analyser"
                  )}
                </button>
              </div>
              
              {error && (
                <div className="error-message">{error}</div>
              )}
            </div>

            {/* Results Section */}
            {result && (
              <div className="results">
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number pink">{formatNumber(result?.data?.views)}</div>
                    <div className="stat-label">Vues</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number red">{formatNumber(result?.data?.likes)}</div>
                    <div className="stat-label">Likes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number blue">{formatNumber(result?.data?.comments)}</div>
                    <div className="stat-label">Commentaires</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number green">{formatNumber(result?.data?.shares)}</div>
                    <div className="stat-label">Partages</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number yellow">{formatNumber(result?.data?.saves)}</div>
                    <div className="stat-label">Sauvegardes</div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="engagement-card">
                  <h3 className="section-title">Taux d'engagement</h3>
                  <div className="engagement-grid">
                    <div className="engagement-item">
                      <div className="engagement-number pink">{(result?.metrics?.engagementRate ?? 0).toFixed(1)}%</div>
                      <div className="engagement-label">Global</div>
                    </div>
                    <div className="engagement-item">
                      <div className="engagement-number red">{(result?.metrics?.likeRate ?? 0).toFixed(1)}%</div>
                      <div className="engagement-label">Likes</div>
                    </div>
                    <div className="engagement-item">
                      <div className="engagement-number blue">{(result?.metrics?.commentRate ?? 0).toFixed(1)}%</div>
                      <div className="engagement-label">Commentaires</div>
                    </div>
                    <div className="engagement-item">
                      <div className="engagement-number green">{(result?.metrics?.shareRate ?? 0).toFixed(1)}%</div>
                      <div className="engagement-label">Partages</div>
                    </div>
                    <div className="engagement-item">
                      <div className="engagement-number yellow">{(result?.metrics?.saveRate ?? 0).toFixed(1)}%</div>
                      <div className="engagement-label">Sauvegardes</div>
                    </div>
                  </div>
                </div>

                {/* Hashtags */}
                {(result?.data?.hashtags?.length ?? 0) > 0 && (
                  <div className="hashtags-card">
                    <h3 className="section-title">Hashtags détectés</h3>
                    <div className="hashtags-container">
                      {result.data.hashtags.map((tag, index) => (
                        <span key={index} className="hashtag-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Recommendations */}
                {result?.advice && (
                  <div className="advice-card">
                    <h3 className="section-title">Recommandations IA</h3>
                    <div className="advice-content">
                      {result.advice}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {!result && (
              <div className="footer-text">
                Collez l'URL d'une vidéo TikTok publique pour commencer l'analyse
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 30%, #2d1b69 70%, #4c1d95 100%);
          color: white;
        }

        .nav {
          padding: 1.5rem;
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          background: linear-gradient(90deg, #f472b6, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-subtitle {
          font-size: 0.875rem;
          opacity: 0.75;
        }

        .hero {
          max-width: 1000px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
          text-align: center;
        }

        .hero-content {
          margin-bottom: 2rem;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          line-height: 1.1;
        }

        .highlight {
          background: linear-gradient(90deg, #f472b6, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          opacity: 0.8;
          max-width: 600px;
          margin: 0 auto 3rem;
          line-height: 1.6;
        }

        .input-section {
          max-width: 600px;
          margin: 0 auto 3rem;
        }

        .input-container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .url-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .url-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .url-input:focus {
          border-color: #f472b6;
          box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.3);
        }

        .analyze-btn {
          background: linear-gradient(90deg, #ec4899, #9333ea);
          border: none;
          border-radius: 0.75rem;
          padding: 0.75rem 2rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 120px;
          justify-content: center;
        }

        .analyze-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #db2777, #7c3aed);
          transform: translateY(-1px);
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #fecaca;
          font-size: 0.875rem;
        }

        .results {
          max-width: 1000px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .stat-number.pink { color: #f472b6; }
        .stat-number.red { color: #f87171; }
        .stat-number.blue { color: #60a5fa; }
        .stat-number.green { color: #4ade80; }
        .stat-number.yellow { color: #fbbf24; }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.75;
        }

        .engagement-card, .hashtags-card, .advice-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 1rem;
        }

        .engagement-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .engagement-item {
          text-align: center;
        }

        .engagement-number {
          font-size: 1.125rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .engagement-number.pink { color: #f472b6; }
        .engagement-number.red { color: #f87171; }
        .engagement-number.blue { color: #60a5fa; }
        .engagement-number.green { color: #4ade80; }
        .engagement-number.yellow { color: #fbbf24; }

        .engagement-label {
          font-size: 0.75rem;
          opacity: 0.75;
        }

        .hashtags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .hashtag-tag {
          background: linear-gradient(90deg, rgba(236, 72, 153, 0.2), rgba(147, 51, 234, 0.2));
          border: 1px solid rgba(244, 114, 182, 0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
        }

        .advice-content {
          white-space: pre-wrap;
          text-align: left;
          line-height: 1.6;
          opacity: 0.9;
        }

        .footer-text {
          margin-top: 4rem;
          text-align: center;
          opacity: 0.5;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .input-container {
            flex-direction: column;
          }

          .analyze-btn {
            width: 100%;
          }

          .nav-content {
            flex-direction: column;
            gap: 0.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
}
