import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  async function handleAnalyze() {
    setError('');
    setResult(null);
    if (!url) {
      setError("Merci d'entrer l'URL d'une vidéo TikTok.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh', backgroundColor: darkMode ? '#1a202c' : '#f7fafc', color: darkMode ? '#f7fafc' : '#2d3748', fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Analyseur TikTok</h1>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', backgroundColor: darkMode ? '#2d3748' : '#e2e8f0', color: darkMode ? '#e2e8f0' : '#2d3748' }}>
            {darkMode ? 'Thème clair' : 'Thème sombre'}
          </button>
        </header>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Colle l'URL de la vidéo TikTok"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid', borderColor: darkMode ? '#4a5568' : '#cbd5e0', backgroundColor: darkMode ? '#2d3748' : '#fff', color: darkMode ? '#f7fafc' : '#2d3748' }}
          />
          <button
            onClick={handleAnalyze}
            style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#3182ce', color: '#fff', cursor: 'pointer' }}
          >
            {loading ? 'Analyse…' : 'Analyser'}
          </button>
        </div>
        {error && <p style={{ color: '#e53e3e' }}>{error}</p>}
        {result && (
          <section style={{ marginTop: '2rem', backgroundColor: darkMode ? '#2d3748' : '#edf2f7', padding: '1.5rem', borderRadius: '0.5rem' }}>
            <h2 style={{ marginTop: 0 }}>Résultats</h2>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              <li>Vues : {result.data.views}</li>
              <li>Likes : {result.data.likes}</li>
              <li>Commentaires : {result.data.comments}</li>
              <li>Partages : {result.data.shares}</li>
              <li>Enregistrements : {result.data.collects}</li>
              <li>Taux d’engagement : {result.engagementRate}%</li>
              <li>Taux de likes : {result.likeRate}%</li>
              <li>Taux de commentaires : {result.commentRate}%</li>
              <li>Taux de partages : {result.shareRate}%</li>
            </ul>
            {result.advice && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Conseils</h3>
                <p style={{ whiteSpace: 'pre-line' }}>{result.advice}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}