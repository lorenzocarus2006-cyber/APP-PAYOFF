"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORMS, RECEIVERS } from "@/config/dropdowns";

export default function AddLinkButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [piattaforma, setPiattaforma] = useState<string>(PLATFORMS[0]);
  const [intestatario, setIntestatario] = useState<string>(RECEIVERS[0]);
  const [url, setUrl] = useState("");

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  async function handleSave() {
    if (!url.trim()) {
      setError("Inserisci il link.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/links/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piattaforma, intestatario, url: url.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio link.");

      setOpen(false);
      setUrl("");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-transform active:scale-[0.98]"
      >
        ＋ Aggiungi link
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          >
            <h2 className="text-xl font-bold text-white">Nuovo link</h2>
            <p className="mt-1 text-sm text-white/70">
              Salvalo nella sezione del bonus giusto, resta lì anche dopo il reload.
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-white/80">Bonus / Piattaforma</span>
                <select
                  value={piattaforma}
                  onChange={(event) => setPiattaforma(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base font-semibold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                >
                  {PLATFORMS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-white/80">Intestatario</span>
                <select
                  value={intestatario}
                  onChange={(event) => setIntestatario(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base font-semibold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                >
                  {RECEIVERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-white/80">Link</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saving) {
                      event.preventDefault();
                      void handleSave();
                    }
                  }}
                  autoFocus
                  placeholder="https://..."
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base font-semibold text-white outline-none placeholder:text-white/40 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="min-h-12 flex-1 rounded-2xl border border-white/40 bg-transparent px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !url.trim()}
                onClick={() => void handleSave()}
                className="min-h-12 flex-1 rounded-2xl bg-white px-5 py-3 text-base font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
