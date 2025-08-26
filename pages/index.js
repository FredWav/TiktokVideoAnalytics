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
              placeholder="Colle l’URL de la vidéo TikTok…"
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

      {/* styles tailwind-like minimal */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        .rounded-2xl {
          border-radius: 1rem;
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
        .mt-6 {
          margin-top: 1.5rem;
        }
        .mb-2 {
          margin-bottom: 0.5rem;
        }
        .grid {
          display: grid;
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
        .items-center {
          align-items: center;
        }
        .justify-between {
          justify-content: space-between;
        }
        .space-y-1 > :not([hidden]) ~ :not([hidden]) {
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}