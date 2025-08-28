import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [tab, setTab] = useState("video"); // "video" | "compte"

  // Vidéo
  const [videoUrl, setVideoUrl] = useState("");
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState("");
  const [vResult, setVResult] = useState(null);

  // Compte
  const [accountInput, setAccountInput] = useState("");
  const [aLoading, setALoading] = useState(false);
  const [aError, setAError] = useState("");
  const [aResult, setAResult] = useState(null);

  async function analyzeVideo(pro) {
    setVError("");
    setVResult(null);

    if (!videoUrl.trim()) {
      setVError("Colle une URL vidéo TikTok valide.");
      return;
    }

    setVLoading(true);
    try {
      // On conserve l’endpoint déjà existant de ton projet
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, pro: !!pro }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur inconnue.");
      setVResult(data);
    } catch (e) {
      setVError(e.message);
    } finally {
      setVLoading(false);
    }
  }

  async function analyzeAccount() {
    setAError("");
    setAResult(null);

    if (!accountInput.trim()) {
      setAError("Entre un @username ou un lien de profil TikTok.");
      return;
    }

    setALoading(true);
    try {
      const res = await fetch("/api/analyze-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: accountInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur inconnue.");
      setAResult(data);
    } catch (e) {
      setAError(e.message);
    } finally {
      setALoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>TikTok Analytics Pro — Analyse Vidéo & Compte</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-[#0b1020] text-white">
        <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="text-pink-300 font-bold">TikTok Analytics Pro</div>
          <div className="hidden md:flex gap-2">
            <a className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">Analyser</a>
            <a className="px-3 py-1 rounded-lg bg-white/0 border border-white/10">Patterns & Insights</a>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-4xl md:text-5xl font-bold text-center">
            Analyse <span className="text-pink-400">TikTok</span> avec GPT-4o
          </h1>
          <p className="mt-3 text-center text-white/70">
            Obtenez des insights professionnels sur une <b>vidéo</b> ou un <b>compte</b>, depuis une seule page.
          </p>

          {/* Toggle Vidéo / Compte */}
          <div className="mt-8 flex w-full justify-center">
            <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
              <button
                onClick={() => setTab("video")}
                className={`px-4 py-2 rounded-lg font-semibold ${tab === "video" ? "bg-gradient-to-r from-pink-500 to-purple-600" : "hover:bg-white/10"}`}
              >
                Analyse Vidéo
              </button>
              <button
                onClick={() => setTab("compte")}
                className={`px-4 py-2 rounded-lg font-semibold ${tab === "compte" ? "bg-gradient-to-r from-pink-500 to-purple-600" : "hover:bg-white/10"}`}
              >
                Analyse Compte
              </button>
            </div>
          </div>

          {/* Bloc VIDÉO */}
          {tab === "video" && (
            <div className="mt-10">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@username/video/..."
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 outline-none focus:border-pink-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    disabled={vLoading}
                    onClick={() => analyzeVideo(false)}
                    className="rounded-xl px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/10 font-semibold disabled:opacity-60"
                  >
                    {vLoading ? "Analyse..." : "Analyse Basique"}
                  </button>
                  <button
                    disabled={vLoading}
                    onClick={() => analyzeVideo(true)}
                    className="rounded-xl px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 font-semibold disabled:opacity-60"
                  >
                    {vLoading ? "Analyse Pro..." : "⭐ Analyse Pro (GPT-4o)"}
                  </button>
                </div>

                {vError && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    {vError}
                  </div>
                )}

                {vResult && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-xl font-semibold mb-2">Résultats vidéo</h3>
                    <pre className="text-sm whitespace-pre-wrap text-white/80">
                      {JSON.stringify(vResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bloc COMPTE */}
          {tab === "compte" && (
            <div className="mt-10">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <input
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  placeholder="Ex: @fredwav ou https://www.tiktok.com/@fredwav"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 outline-none focus:border-pink-500"
                />

                <div className="mt-4">
                  <button
                    disabled={aLoading}
                    onClick={analyzeAccount}
                    className="rounded-xl px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 font-semibold disabled:opacity-60"
                  >
                    {aLoading ? "Analyse en cours..." : "Lancer l’analyse de compte"}
                  </button>
                </div>

                {aError && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    {aError}
                  </div>
                )}

                {aResult && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-xl font-semibold mb-2">Résultats compte (MVP)</h3>
                    <pre className="text-sm whitespace-pre-wrap text-white/80">
                      {JSON.stringify(aResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <p className="mt-6 text-white/50 text-sm">
                Note : le compte renverra plus tard les métriques agrégées (dernières vidéos, fréquence de post,
                hooks récurrents, watch-time estimé, etc.). Cette page est prête à consommer l’API.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
