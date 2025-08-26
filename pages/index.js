import { useState, useEffect } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  // ... (le reste de tes states pour les onglets)

  // ... (le reste de tes fonctions useEffect, loadPatterns)

  async function handleAnalyze(tier = 'free') {
    // ... (ta fonction handleAnalyze reste la même)
  }

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // NOUVELLE FONCTION pour formater la durée en MM:SS
  const formatDuration = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // ... (le reste de ta fonction getEngagementColor, renderAiAnalysis)

  return (
    <>
      {/* ... (Tout ton JSX de <div className="app"> jusqu'à .stats-grid) */}
      
      {/* Modifie la grille de stats pour inclure la durée */}
      {result && (
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
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-number blue">{formatNumber(result.stats?.comments)}</div>
              <div className="stat-label">Commentaires</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📤</div>
              <div className="stat-number green">{formatNumber(result.stats?.shares)}</div>
              <div className="stat-label">Partages</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📌</div>
              <div className="stat-number yellow">{formatNumber(result.stats?.saves)}</div>
              <div className="stat-label">Sauvegardes</div>
            </div>
            {/* NOUVELLE CARTE POUR LA DURÉE */}
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-number">{formatDuration(result.stats?.duration)}</div>
              <div className="stat-label">Durée</div>
            </div>
        </div>
      )}

      {/* ... (Tout le reste de ton JSX) */}
      {/* ... (Toute ta balise <style jsx global>) */}
    </>
  );
}
