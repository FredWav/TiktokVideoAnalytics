</div>
                  )}

                  {/* Description */}
                  {result.description && (
                    <div className="description-card">
                      <h3 className="section-title">📝 Description</h3>
                      <p className="description-text">{result.description}</p>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {result.advice && (
                    <div className="advice-card">
                      <h3 className="section-title">🎯 Recommandations IA Personnalisées</h3>
                      <div className="advice-content">
                        {result.advice}
                      </div>
                    </div>
                  )}

                  {/* Predictions */}
                  {result.predictions && (
                    <div className="predictions-card">
                      <h3 className="section-title">🔮 Prédictions & Potentiel</h3>
                      <div className="predictions-content">
                        {result.predictions}
                      </div>
                    </div>
                  )}

                  {/* Notices */}
                  {(result.notices?.length > 0) && (
                    <div className="notices-card">
                      <h3 className="section-title">ℹ️ Remarques</h3>
                      <ul className="notices-list">
                        {result.notices.map((notice, index) => (
                          <li key={index}>{notice}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Patterns */}
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
            ) : patterns && (
              <div className="patterns-content">
                {/* Stats aggregées */}
                {patterns.aggregatedStats && (
                  <div className="aggregated-stats">
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

                {/* Top Hashtags */}
                {patterns.topHashtags && patterns.topHashtags.length > 0 && (
                  <div className="top-hashtags-card">
                    <h3>🏆 Top Hashtags</h3>
                    <div className="hashtags-list">
                      {patterns.topHashtags.map((item, i) => (
                        <div key={i} className="hashtag-item">
                          <span className="hashtag-rank">#{i+1}</span>
                          <span className="hashtag-name">{item.tag}</span>
                          <span className="hashtag-usage">Utilisé dans {item.percentage}% des vidéos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success vs Failure Patterns */}
                <div className="patterns-comparison">
                  {patterns.successPatterns && (
                    <div className="pattern-card success">
                      <h4>🚀 Patterns de succès (>5% engagement)</h4>
                      <p><strong>Engagement moyen:</strong> {patterns.successPatterns.avgEngagement?.toFixed(1) || 0}%</p>
                      <p><strong>Vues moyennes:</strong> {formatNumber(patterns.successPatterns.avgViews)}</p>
                      {patterns.successPatterns.commonHashtags?.length > 0 && (
                        <div>
                          <p><strong>Hashtags communs:</strong></p>
                          <div className="common-tags">
                            {patterns.successPatterns.commonHashtags.map((tag, i) => (
                              <span key={i} className="tag-badge">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {patterns.successPatterns.commonContentTypes?.length > 0 && (
                        <div>
                          <p><strong>Types de contenu:</strong></p>
                          <ul>
                            {patterns.successPatterns.commonContentTypes.map((type, i) => (
                              <li key={i}>{type}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {patterns.failurePatterns && (
                    <div className="pattern-card failure">
                      <h4>📉 Patterns d'échec (<1% engagement)</h4>
                      <p><strong>Engagement moyen:</strong> {patterns.failurePatterns.avgEngagement?.toFixed(1) || 0}%</p>
                      <p><strong>Vues moyennes:</strong> {formatNumber(patterns.failurePatterns.avgViews)}</p>
                      {patterns.failurePatterns.commonIssues?.length > 0 && (
                        <div>
                          <p><strong>Problèmes récurrents:</strong></p>
                          <ul>
                            {patterns.failurePatterns.commonIssues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recent Analyses */}
                {patterns.recentAnalyses && patterns.recentAnalyses.length > 0 && (
                  <div className="recent-analyses">
                    <h3>📊 Analyses récentes</h3>
                    <div className="analyses-list">
                      {patterns.recentAnalyses.map((analysis, i) => (
                        <div key={i} className="analysis-row">
                          <span className="analysis-user">@{analysis.username}</span>
                          <span className="analysis-views">{formatNumber(analysis.views)} vues</span>
                          <span className={`analysis-engagement ${getEngagementColor(analysis.engagement)}`}>
                            {analysis.engagement?.toFixed(1) || 0}% engagement
                          </span>
                          <span className="analysis-time">
                            {new Date(analysis.timestamp).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {patterns.analysisCount === 0 && (
                  <div className="no-data-card">
                    <p>Aucune donnée disponible pour cette niche.</p>
                    <p>Analysez des vidéos de cette catégorie pour commencer à voir des patterns!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-content {
          max-width: 1400px;
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

        .nav-tabs {
          display: flex;
          gap: 1rem;
        }

        .nav-tab {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .nav-tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-tab.active {
          background: linear-gradient(90deg, #ec4899, #9333ea);
          border-color: transparent;
        }

        .hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }

        .hero-content {
          text-align: center;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 1rem;
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
          margin-bottom: 3rem;
        }

        .input-section {
          max-width: 700px;
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
          transition: all 0.3s;
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
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 140px;
          justify-content: center;
        }

        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4);
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
        }

        .results {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Thumbnail Card */
        .thumbnail-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .thumbnail-img {
          max-width: 300px;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }

        .video-info {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
        }

        .username {
          font-size: 1.25rem;
          font-weight: 600;
          color: #f472b6;
        }

        .niche-tag {
          background: linear-gradient(90deg, #ec4899, #9333ea);
          padding: 0.25rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
        }

        /* Performance Badge */
        .performance-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem 3rem;
          margin-bottom: 2rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .performance-badge.viral {
          border-color: #f472b6;
          background: linear-gradient(135deg, rgba(244, 114, 182, 0.2), rgba(244, 114, 182, 0.05));
        }

        .performance-badge.excellent {
          border-color: #4ade80;
          background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.05));
        }

        .performance-badge.good {
          border-color: #60a5fa;
          background: linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(96, 165, 250, 0.05));
        }

        .performance-badge.average {
          border-color: #fbbf24;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05));
        }

        .performance-badge.low {
          border-color: #f87171;
          background: linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(248, 113, 113, 0.05));
        }

        .badge-label {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .badge-value {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .badge-rate {
          font-size: 1rem;
          opacity: 0.9;
        }

        /* Analysis Card */
        .analysis-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .analysis-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .analysis-label {
          opacity: 0.7;
        }

        .analysis-value {
          font-weight: 600;
          color: #f472b6;
        }

        /* Quality Scores */
        .quality-scores {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .quality-scores h4 {
          margin-bottom: 1rem;
          opacity: 0.9;
        }

        .score-item {
          display: grid;
          grid-template-columns: 80px 1fr 50px;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .score-label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .score-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          background: linear-gradient(90deg, #ec4899, #9333ea);
          transition: width 0.5s ease;
        }

        .score-value {
          text-align: right;
          font-weight: 600;
        }

        /* Factors Grid */
        .factors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .factor-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .factor-card.success {
          border-color: rgba(74, 222, 128, 0.5);
          background: rgba(74, 222, 128, 0.05);
        }

        .factor-card.warning {
          border-color: rgba(251, 191, 36, 0.5);
          background: rgba(251, 191, 36, 0.05);
        }

        .factor-card h4 {
          margin-bottom: 1rem;
        }

        .factor-card ul {
          list-style: none;
          padding: 0;
        }

        .factor-card li {
          padding: 0.25rem 0;
          opacity: 0.9;
        }

        /* Benchmark Card */
        .benchmark-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .benchmark-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .benchmark-item {
          text-align: center;
        }

        .benchmark-metric {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .benchmark-values {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .benchmark-values .current {
          font-size: 1.25rem;
          font-weight: bold;
          color: #f472b6;
        }

        .benchmark-values .vs {
          opacity: 0.5;
        }

        .benchmark-values .target {
          font-size: 1.25rem;
          opacity: 0.7;
        }

        .benchmark-indicator {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .benchmark-indicator.positive {
          color: #4ade80;
        }

        .benchmark-indicator.negative {
          color: #f87171;
        }

        /* Stats Grid */
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
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
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

        .stat-rate {
          font-size: 0.75rem;
          opacity: 0.6;
          margin-top: 0.25rem;
        }

        /* Hashtags & Other Cards */
        .hashtags-card, .description-card, .advice-card, .predictions-card, .notices-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
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

        .hashtag-tag.recommended {
          background: linear-gradient(90deg, rgba(74, 222, 128, 0.2), rgba(52, 211, 153, 0.2));
          border-color: rgba(74, 222, 128, 0.5);
        }

        .missing-hashtags {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .missing-hashtags p {
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .description-text {
          white-space: pre-wrap;
          line-height: 1.6;
          opacity: 0.9;
        }

        .advice-content, .predictions-content {
          white-space: pre-wrap;
          line-height: 1.6;
          opacity: 0.9;
        }

        .notices-list {
          list-style: none;
          padding: 0;
        }

        .notices-list li {
          background: rgba(251, 191, 36, 0.1);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
          border-left: 3px solid #fbbf24;
        }

        /* Patterns Section */
        .patterns-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }

        .patterns-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .patterns-header h2 {
          font-size: 2.5rem;
          margin-bottom: 2rem;
        }

        .niche-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .niche-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .niche-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .niche-btn.active {
          background: linear-gradient(90deg, #ec4899, #9333ea);
          border-color: transparent;
        }

        .niche-icon {
          font-size: 1.25rem;
        }

        .niche-label {
          font-size: 0.875rem;
        }

        .loading-patterns {
          text-align: center;
          padding: 4rem;
        }

        .loading-patterns .spinner {
          width: 3rem;
          height: 3rem;
          margin: 0 auto 1rem;
        }

        .patterns-content {
          display: grid;
          gap: 2rem;
        }

        /* Aggregated Stats */
        .aggregated-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .agg-stat {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
        }

        .agg-value {
          font-size: 2rem;
          font-weight: bold;
          color: #f472b6;
          margin-bottom: 0.5rem;
        }

        .agg-label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        /* Top Hashtags */
        .top-hashtags-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
        }

        .top-hashtags-card h3 {
          margin-bottom: 1.5rem;
        }

        .hashtags-list {
          display: grid;
          gap: 0.75rem;
        }

        .hashtag-item {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          transition: all 0.3s;
        }

        .hashtag-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .hashtag-rank {
          font-weight: bold;
          color: #f472b6;
        }

        .hashtag-name {
          font-size: 1rem;
        }

        .hashtag-usage {
          background: linear-gradient(90deg, #ec4899, #9333ea);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
        }

        /* Patterns Comparison */
        .patterns-comparison {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .pattern-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1.5rem;
          border: 2px solid;
        }

        .pattern-card.success {
          border-color: rgba(74, 222, 128, 0.5);
        }

        .pattern-card.failure {
          border-color: rgba(248, 113, 113, 0.5);
        }

        .pattern-card h4 {
          margin-bottom: 1rem;
        }

        .pattern-card p {
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .pattern-card strong {
          color: #f472b6;
        }

        .common-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .tag-badge {
          background: rgba(244, 114, 182, 0.2);
          border: 1px solid rgba(244, 114, 182, 0.3);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .pattern-card ul {
          list-style: none;
          padding-left: 0;
          margin-top: 0.5rem;
        }

        .pattern-card li {
          padding: 0.25rem 0;
          opacity: 0.9;
        }

        /* Recent Analyses */
        .recent-analyses {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 2rem;
        }

        .recent-analyses h3 {
          margin-bottom: 1.5rem;
        }

        .analyses-list {
          display: grid;
          gap: 0.75rem;
        }

        .analysis-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .analysis-row:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .analysis-user {
          font-weight: 600;
          color: #f472b6;
        }

        .analysis-views {
          text-align: center;
        }

        .analysis-engagement {
          text-align: center;
          font-weight: 600;
        }

        .analysis-engagement.viral { color: #f472b6; }
        .analysis-engagement.excellent { color: #4ade80; }
        .analysis-engagement.good { color: #60a5fa; }
        .analysis-engagement.average { color: #fbbf24; }
        .analysis-engagement.low { color: #f87171; }

        .analysis-time {
          opacity: 0.7;
          text-align: right;
        }

        /* No Data Card */
        .no-data-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 3rem;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .no-data-card p {
          margin-bottom: 1rem;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
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

          .nav-tabs {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .benchmark-grid {
            grid-template-columns: 1fr;
          }

          .analysis-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            text-align: left;
          }

          .analysis-row > * {
            text-align: left !important;
          }

          .niche-selector {
            max-height: 200px;
            overflow-y: auto;
            padding: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
          }

          .patterns-comparison {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}// pages/index.js
import { useState, useEffect } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
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
      }
    } catch (err) {
      console.error("Erreur chargement patterns:", err);
    }
    setLoadingPatterns(false);
  }

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
    if (num === undefined || num === null) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEngagementColor = (rate) => {
    if (rate > 10) return "viral";
    if (rate > 5) return "excellent";
    if (rate > 3) return "good";
    if (rate > 1) return "average";
    return "low";
  };

  return (
    <>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TikTok Analytics Pro</div>
            <div className="nav-tabs">
              <button 
                className={`nav-tab ${activeTab === "analyze" ? "active" : ""}`}
                onClick={() => setActiveTab("analyze")}
              >
                Analyser
              </button>
              <button 
                className={`nav-tab ${activeTab === "patterns" ? "active" : ""}`}
                onClick={() => setActiveTab("patterns")}
              >
                Patterns & Insights
              </button>
            </div>
          </div>
        </nav>

        {/* Tab: Analyse */}
        {activeTab === "analyze" && (
          <div className="hero">
            <div className="hero-content">
              <h1 className="hero-title">
                Analyse <span className="highlight">TikTok</span> avec IA
              </h1>
              <p className="hero-subtitle">
                Intelligence artificielle pour décoder vos performances et découvrir les patterns viraux
              </p>

              <div className="input-section">
                <div className="input-container">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@username/video/..."
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
                  <div className="error-message">⚠️ {error}</div>
                )}
              </div>

              {result && (
                <div className="results">
                  {/* Thumbnail et info de base */}
                  {result.thumbnail && (
                    <div className="thumbnail-card">
                      <img src={result.thumbnail} alt="Vidéo thumbnail" className="thumbnail-img"/>
                      <div className="video-info">
                        <div className="username">@{result.username || "unknown"}</div>
                        <div className="niche-tag">{result.niche}</div>
                      </div>
                    </div>
                  )}

                  {/* Performance Badge */}
                  {result.metrics && (
                    <div className={`performance-badge ${getEngagementColor(result.metrics.engagementRate)}`}>
                      <div className="badge-label">Performance</div>
                      <div className="badge-value">{result.metrics.performanceLevel}</div>
                      <div className="badge-rate">{(result.metrics.engagementRate || 0).toFixed(1)}% d'engagement</div>
                    </div>
                  )}

                  {/* Analyse IA détaillée */}
                  {result.analysis && (
                    <div className="analysis-card">
                      <h3 className="section-title">🤖 Analyse IA Détaillée</h3>
                      <div className="analysis-grid">
                        <div className="analysis-item">
                          <span className="analysis-label">Type de contenu:</span>
                          <span className="analysis-value">{result.analysis.contentType || "Non identifié"}</span>
                        </div>
                        <div className="analysis-item">
                          <span className="analysis-label">Sous-niche:</span>
                          <span className="analysis-value">{result.analysis.subNiche || "Non identifiée"}</span>
                        </div>
                        {result.analysis.audienceProfile && (
                          <div className="analysis-item">
                            <span className="analysis-label">Audience cible:</span>
                            <span className="analysis-value">
                              {result.analysis.audienceProfile.ageRange}, {result.analysis.audienceProfile.primaryGender}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quality Scores */}
                      {result.analysis.contentQuality && (
                        <div className="quality-scores">
                          <h4>Scores de qualité</h4>
                          <div className="score-item">
                            <div className="score-label">Hook</div>
                            <div className="score-bar">
                              <div className="score-fill" style={{width: `${result.analysis.contentQuality.hook * 10}%`}}></div>
                            </div>
                            <div className="score-value">{result.analysis.contentQuality.hook}/10</div>
                          </div>
                          <div className="score-item">
                            <div className="score-label">Rétention</div>
                            <div className="score-bar">
                              <div className="score-fill" style={{width: `${result.analysis.contentQuality.retention * 10}%`}}></div>
                            </div>
                            <div className="score-value">{result.analysis.contentQuality.retention}/10</div>
                          </div>
                          <div className="score-item">
                            <div className="score-label">CTA</div>
                            <div className="score-bar">
                              <div className="score-fill" style={{width: `${result.analysis.contentQuality.cta * 10}%`}}></div>
                            </div>
                            <div className="score-value">{result.analysis.contentQuality.cta}/10</div>
                          </div>
                        </div>
                      )}

                      {/* Viral Factors & Weak Points */}
                      <div className="factors-grid">
                        {result.analysis.viralFactors && result.analysis.viralFactors.length > 0 && (
                          <div className="factor-card success">
                            <h4>✅ Facteurs de succès</h4>
                            <ul>
                              {result.analysis.viralFactors.map((factor, i) => (
                                <li key={i}>{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.analysis.weakPoints && result.analysis.weakPoints.length > 0 && (
                          <div className="factor-card warning">
                            <h4>⚠️ Points d'amélioration</h4>
                            <ul>
                              {result.analysis.weakPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comparaison Benchmarks */}
                  {result.benchmarks && (
                    <div className="benchmark-card">
                      <h3 className="section-title">📊 VS Benchmarks {result.niche}</h3>
                      <div className="benchmark-grid">
                        <div className="benchmark-item">
                          <div className="benchmark-metric">Engagement</div>
                          <div className="benchmark-values">
                            <span className="current">{(result.metrics?.engagementRate || 0).toFixed(1)}%</span>
                            <span className="vs">vs</span>
                            <span className="target">{result.benchmarks.engagement}%</span>
                          </div>
                          <div className={`benchmark-indicator ${(result.metrics?.engagementRate || 0) > result.benchmarks.engagement ? 'positive' : 'negative'}`}>
                            {(result.metrics?.engagementRate || 0) > result.benchmarks.engagement ? '↑' : '↓'} 
                            {Math.abs((result.metrics?.engagementRate || 0) - result.benchmarks.engagement).toFixed(1)}%
                          </div>
                        </div>
                        <div className="benchmark-item">
                          <div className="benchmark-metric">Likes</div>
                          <div className="benchmark-values">
                            <span className="current">{(result.metrics?.likeRate || 0).toFixed(1)}%</span>
                            <span className="vs">vs</span>
                            <span className="target">{result.benchmarks.likes}%</span>
                          </div>
                        </div>
                        <div className="benchmark-item">
                          <div className="benchmark-metric">Commentaires</div>
                          <div className="benchmark-values">
                            <span className="current">{(result.metrics?.commentRate || 0).toFixed(1)}%</span>
                            <span className="vs">vs</span>
                            <span className="target">{result.benchmarks.comments}%</span>
                          </div>
                        </div>
                        <div className="benchmark-item">
                          <div className="benchmark-metric">Partages</div>
                          <div className="benchmark-values">
                            <span className="current">{(result.metrics?.shareRate || 0).toFixed(1)}%</span>
                            <span className="vs">vs</span>
                            <span className="target">{result.benchmarks.shares}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">👁️</div>
                      <div className="stat-number pink">{formatNumber(result.stats?.views)}</div>
                      <div className="stat-label">Vues</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">❤️</div>
                      <div className="stat-number red">{formatNumber(result.stats?.likes)}</div>
                      <div className="stat-label">Likes</div>
                      <div className="stat-rate">{(result.stats?.likeRate || 0).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">💬</div>
                      <div className="stat-number blue">{formatNumber(result.stats?.comments)}</div>
                      <div className="stat-label">Commentaires</div>
                      <div className="stat-rate">{(result.stats?.commentRate || 0).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📤</div>
                      <div className="stat-number green">{formatNumber(result.stats?.shares)}</div>
                      <div className="stat-label">Partages</div>
                      <div className="stat-rate">{(result.stats?.shareRate || 0).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📌</div>
                      <div className="stat-number yellow">{formatNumber(result.stats?.saves)}</div>
                      <div className="stat-label">Sauvegardes</div>
                      <div className="stat-rate">{(result.stats?.saveRate || 0).toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  {(result.hashtags?.length > 0) && (
                    <div className="hashtags-card">
                      <h3 className="section-title">Hashtags détectés</h3>
                      <div className="hashtags-container">
                        {result.hashtags.map((tag, index) => (
                          <span key={index} className="hashtag-tag">{tag}</span>
                        ))}
                      </div>
                      {result.analysis?.hashtagAnalysis?.missing && (
                        <div className="missing-hashtags">
                          <p>💡 Hashtags recommandés:</p>
                          <div className="hashtags-container">
                            {result.analysis.hashtagAnalysis.missing.map((tag, i) => (
                              <span key={i} className="hashtag-tag recommended">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
