import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [dark, setDark] = useState(false);

  async function handleAnalyze() {
    setErr("");
    setRes(null);
    if (!url) return setErr("Colle une URL TikTok publique.");
    try {
      setLoading(true);
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Erreur inconnue");
      setRes(json);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cx = (...c) => c.filter(Boolean).join(" ");
  const box = "rounded-2xl p-4 border";

  return (
    <div
      className={cx(
        "min-h-screen",
        dark ? "bg-[#0f1115] text-white" : "bg-white text-[#0f1115]"
      )}
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}
    >
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Analyse vidéo TikTok</h1>
          <button
            onClick={() => setDark((d) => !d)}
            className="text-sm opacity-70 hover:opacity-100"
          >
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>

        <div
          className={cx(
            box,
            dark ? "border-zinc-800 bg-black/20" : "border-zinc-200 bg-white/60",
            "mt-6"
          )}
        >
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Colle l'URL de la vidéo TikTok…"
              className={cx(
                "flex-1 px-3 py-2 rounded-lg outline-none",
                dark ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-300"
              )}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={cx(
                "px-4 py-2 rounded-lg font-medium",
                dark ? "bg-white text-black" : "bg-black text-white",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Analyse…" : "Analyser"}
            </button>
          </div>
          {err && <p className="mt-3 text-red-500 text-sm">{err}</p>}
        </div>

        {res && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div
              className={cx(
                box,
                dark ? "border-zinc-800 bg-black/20" : "border-zinc-200 bg-white/60"
              )}
            >
              <h2 className="font-semibold mb-2">Statistiques</h2>
              <ul className="space-y-1 text-sm">
                <li>Vues : {res.data.views.toLocaleString()}</li>
                <li>Likes : {res.data.likes.toLocaleString()}</li>
                <li>Commentaires : {res.data.comments.toLocaleString()}</li>
                <li>Partages : {res.data.shares.toLocaleString()}</li>
                <li>Enregistrements : {res.data.saves.toLocaleString()}</li>
                <li className="mt-2">
                  Hashtags : {res.data.hashtags.join(" ") || "–"}
                </li>
              </ul>
            </div>
            <div
              className={cx(
                box,
                dark ? "border-zinc-800 bg-black/20" : "border-zinc-200 bg-white/60"
              )}
            >
              <h2 className="font-semibold mb-2">Taux</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  Engagement global : {res.metrics.engagementRate.toFixed(2)}%
                </li>
                <li>Likes/Vues : {res.metrics.likeRate.toFixed(2)}%</li>
                <li>
                  Commentaires/Vues : {res.metrics.commentRate.toFixed(2)}%
                </li>
                <li>
                  Partages/Vues : {res.metrics.shareRate.toFixed(2)}%
                </li>
                <li>
                  Enregistrements/Vues : {res.metrics.saveRate.toFixed(2)}%
                </li>
              </ul>
            </div>
            <div
              className={cx(
                box,
                "md:col-span-2",
                dark ? "border-zinc-800 bg-black/20" : "border-zinc-200 bg-white/60"
              )}
            >
              <h2 className="font-semibold mb-2">Conseils</h2>
              <pre className="text-sm whitespace-pre-wrap leading-relaxed opacity-90">
                {res.advice}
              </pre>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        .rounded-2xl {
          border-radius: 1rem;
        }
        .rounded-lg {
          border-radius: 0.5rem;
        }
        .border {
          border-width: 1px;
        }
        .p-4 {
          padding: 1rem;
        }
        .p-6 {
          padding: 1.5rem;
        }
        .px-3 {
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }
        .py-2 {
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
        }
        .px-4 {
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .mt-6 {
          margin-top: 1.5rem;
        }
        .mt-3 {
          margin-top: 0.75rem;
        }
        .mt-2 {
          margin-top: 0.5rem;
        }
        .mb-2 {
          margin-bottom: 0.5rem;
        }
        .grid {
          display: grid;
        }
        .gap-2 {
          gap: 0.5rem;
        }
        .gap-4 {
          gap: 1rem;
        }
        .max-w-3xl {
          max-width: 48rem;
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        .flex {
          display: flex;
        }
        .flex-1 {
          flex: 1;
        }
        .items-center {
          align-items: center;
        }
        .justify-between {
          justify-content: space-between;
        }
        .space-y-1 > :not([hidden]) ~ :not([hidden]) {
          margin-top: 0.25rem;
        }
        .text-2xl {
          font-size: 1.5rem;
          line-height: 2rem;
        }
        .text-sm {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        .font-bold {
          font-weight: 700;
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-medium {
          font-weight: 500;
        }
        .opacity-70 {
          opacity: 0.7;
        }
        .opacity-60 {
          opacity: 0.6;
        }
        .opacity-90 {
          opacity: 0.9;
        }
        .hover\\:opacity-100:hover {
          opacity: 1;
        }
        .cursor-not-allowed {
          cursor: not-allowed;
        }
        .outline-none {
          outline: none;
        }
        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
        .leading-relaxed {
          line-height: 1.625;
        }
        .min-h-screen {
          min-height: 100vh;
        }
        .bg-white {
          background-color: white;
        }
        .bg-black {
          background-color: black;
        }
        .text-white {
          color: white;
        }
        .text-black {
          color: black;
        }
        .text-red-500 {
          color: #ef4444;
        }
        .bg-zinc-900 {
          background-color: #18181b;
        }
        .border-zinc-800 {
          border-color: #27272a;
        }
        .border-zinc-200 {
          border-color: #e4e4e7;
        }
        .border-zinc-300 {
          border-color: #d4d4d8;
        }
        .bg-black\\/20 {
          background-color: rgba(0, 0, 0, 0.2);
        }
        .bg-white\\/60 {
          background-color: rgba(255, 255, 255, 0.6);
        }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .md\\:col-span-2 {
            grid-column: span 2 / span 2;
          }
        }
      `}</style>
    </div>
  );
}
