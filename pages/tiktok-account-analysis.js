import { useState } from 'react';

export default function TikTokAccountAnalysis() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/tiktok-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Request failed');
      }
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>TikTok Account Analysis</h1>
      <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="@username (without @)"
          required
          pattern="[A-Za-z0-9._]{2,32}"
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && (
        <section>
          <h2>Result for {data.parsed?.user?.nickname || username}</h2>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#eee', padding: '1rem', borderRadius: 6 }}>
{JSON.stringify({
  stats: data.parsed?.stats,
  derived: data.derived,
  aiSummary: data.aiReport
}, null, 2)}
            </pre>
        </section>
      )}
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.7 }}>
        Note: Data is heuristic and may be incomplete if TikTok layout changes.
      </p>
    </main>
  );
}