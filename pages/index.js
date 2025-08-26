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
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            TikTok Analytics
          </div>
          <div className="text-sm opacity-75">Analysez vos performances</div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Analysez vos vidéos{" "}
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              TikTok
            </span>
          </h1>
          <p className="text-xl opacity-80 max-w-2xl mx-auto leading-relaxed">
            Obtenez des insights détaillés sur vos performances, taux d'engagement 
            et recommandations personnalisées powered by IA.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Collez votre URL TikTok ici..."
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyse...</span>
                  </div>
                ) : (
                  "Analyser"
                )}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="max-w-5xl mx-auto">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <div className="text-2xl font-bold text-pink-400 mb-2">
                  {formatNumber(result.data.views)}
                </div>
                <div className="text-sm opacity-75">Vues</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <div className="text-2xl font-bold text-red-400 mb-2">
                  {formatNumber(result.data.likes)}
                </div>
                <div className="text-sm opacity-75">Likes</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-2">
                  {formatNumber(result.data.comments)}
                </div>
                <div className="text-sm opacity-75">Commentaires</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  {formatNumber(result.data.shares)}
                </div>
                <div className="text-sm opacity-75">Partages</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-2">
                  {formatNumber(result.data.saves)}
                </div>
                <div className="text-sm opacity-75">Sauvegardes</div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
              <h3 className="text-xl font-semibold mb-4 text-center">Taux d'engagement</h3>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-pink-400">
                    {result.metrics.engagementRate.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">Global</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">
                    {result.metrics.likeRate.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {result.metrics.commentRate.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">Commentaires</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">
                    {result.metrics.shareRate.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">Partages</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">
                    {result.metrics.saveRate.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">Sauvegardes</div>
                </div>
              </div>
            </div>

            {/* Hashtags */}
            {result.data.hashtags.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
                <h3 className="text-xl font-semibold mb-4 text-center">Hashtags détectés</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {result.data.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {result.advice && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Recommandations IA
                </h3>
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-left leading-relaxed opacity-90">
                    {result.advice}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!result && (
          <div className="mt-16 text-center opacity-50">
            <p className="text-sm">
              Collez l'URL d'une vidéo TikTok publique pour commencer l'analyse
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
