// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const onAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setData(null);
    if (!url.trim()) {
      setError('Colle un lien TikTok valide.');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json?.error || 'Analyse impossible.');
      } else {
        setData(json);
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    typeof n === 'number'
      ? n.toLocaleString('fr-FR')
      : (n || '').toString();

  const pct = (n) =>
    n == null ? '—' : `${Number(n).toFixed(2)}%`;

  // Points d'amélioration "humains" : uniquement si info manquante
  const improvementPoints = (d) => {
    const points = [];
    if (d?.description === 'aucune description trouvée') {
      points.push("ajoute une description courte avec 1–2 mots-clés + un CTA simple");
    }
    if (!d?.hashtags || d.hashtags.length === 0) {
      points.push("ajoute 2–4 hashtags pertinents (pas de spam)");
    }
    return points;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f1020 0%, #141536 100%)',
      color: '#fff',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji","Segoe UI Emoji"'
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
          TikTok Video Analyzer
        </h1>
        <p style={{ opacity: 0.85, marginBottom: 24 }}>
          Colle l’URL d’une vidéo TikTok. On calcule l’engagement et on remonte description, hashtags et miniature.
        </p>

        <form onSubmit={onAnalyze} style={{
          display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap'
        }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/xxxxxxxxx"
            style={{
              flex: 1,
              minWidth: 300,
              background: '#1c1d3a',
              color: '#fff',
              border: '1px solid #2a2b55',
              padding: '12px 14px',
              borderRadius: 10,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#3a3b6b' : '#5865F2',
              color: '#fff',
              border: 'none',
              padding: '12px 18px',
              borderRadius: 10,
              cursor: loading ? 'default' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Analyse…' : 'Analyser'}
          </button>
        </form>

        {error && (
          <div style={{
            background: '#2a1f2a',
            border: '1px solid #7a3a4a',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {data && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Miniature + infos brèves */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: 16,
              background: '#1a1b34',
              border: '1px solid #2a2b55',
              borderRadius: 16,
              padding: 16
            }}>
              <div>
                {data.thumbnail ? (
                  <img
                    src={data.thumbnail}
                    alt="Miniature"
                    style={{ width: '100%', borderRadius: 12, border: '1px solid #2a2b55' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '9/16', background: '#0f1026',
                    border: '1px dashed #2a2b55', borderRadius: 12,
                    display: 'grid', placeItems: 'center', opacity: 0.7, fontSize: 12
                  }}>
                    Pas de miniature
                  </div>
                )}
              </div>
              <div>
                <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 16 }}>
                  Description
                </div>
                <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
                  {data.description}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Hashtags</div>
                  {data.hashtags && data.hashtags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {data.hashtags.map((t, i) => (
                        <span key={i} style={{
                          background: '#11122a',
                          border: '1px solid #2a2b55',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          opacity: 0.95
                        }}>{t}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ opacity: 0.7 }}>pas de hashtags extraits</div>
                  )}
                </div>
                <div style={{ marginTop: 12, opacity: 0.9 }}>
                  <span style={{ fontWeight: 600 }}>Niche : </span>{data.niche}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              background: '#1a1b34',
              border: '1px solid #2a2b55',
              borderRadius: 16,
              padding: 16
            }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 16 }}>
                Analyse des Stats
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.9 }}>
                <li><b>Vues</b> : {fmt(data.stats.views)}</li>
                <li><b>Likes</b> : {fmt(data.stats.likes)} ({pct(data.stats.likeRate)})</li>
                <li><b>Commentaires</b> : {fmt(data.stats.comments)} ({pct(data.stats.commentRate)})</li>
                <li><b>Partages</b> : {fmt(data.stats.shares)} ({pct(data.stats.shareRate)})</li>
                <li><b>Enregistrements</b> : {fmt(data.stats.saves)} ({pct(data.stats.saveRate)})</li>
                <li><b>Taux d'engagement global</b> : {pct(data.stats.engagementRate)}</li>
              </ul>
            </div>

            {/* Points d'amélioration (uniquement si manque) */}
            {improvementPoints(data).length > 0 && (
              <div style={{
                background: '#231f3a',
                border: '1px solid #4b3f78',
                borderRadius: 16,
                padding: 16
              }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  ⚠️ Points d'amélioration
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                  {improvementPoints(data).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notices techniques */}
            {data.notices && data.notices.length > 0 && (
              <div style={{
                background: '#2a1f2a',
                border: '1px solid #7a3a4a',
                borderRadius: 16,
                padding: 16
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Notes</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {data.notices.map((n, i) => (
                    <li key={i} style={{ opacity: 0.9 }}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
