"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddPlatformButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [bonus, setBonus] = useState("");
  const [spese, setSpese] = useState("");
  const [amazon, setAmazon] = useState("");

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  function reset() {
    setLabel("");
    setBonus("");
    setSpese("");
    setAmazon("");
  }

  async function handleSave() {
    if (!label.trim()) {
      setError("Inserisci il nome della piattaforma.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/platforms/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          bonus: Number(bonus || 0),
          spese: Number(spese || 0),
          amazon: Number(amazon || 0),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore creazione piattaforma.");

      setOpen(false);
      reset();
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
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/40 bg-white/5 px-5 py-3 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
      >
        ＋ Registra nuova tipologia di bonus
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
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0F1420] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          >
            <h2 className="text-xl font-bold text-white">Nuova tipologia di bonus</h2>
            <p className="mt-1 text-sm text-white/70">
              Diventa disponibile subito in tutta l&apos;app: dropdown, filtri, statistiche.
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="field-label">Nome piattaforma</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  autoFocus
                  placeholder="Es. N26"
                  className="field-input"
                />
              </label>

              <label className="block space-y-1">
                <span className="field-label">Bonus totale</span>
                <input
                  type="number"
                  value={bonus}
                  placeholder="0"
                  onChange={(event) => setBonus(event.target.value)}
                  className="field-input"
                />
              </label>

              <label className="block space-y-1">
                <span className="field-label">Spese</span>
                <input
                  type="number"
                  value={spese}
                  placeholder="0"
                  onChange={(event) => setSpese(event.target.value)}
                  className="field-input"
                />
              </label>

              <label className="block space-y-1">
                <span className="field-label">Buoni Amazon (opzionale)</span>
                <input
                  type="number"
                  value={amazon}
                  placeholder="0"
                  onChange={(event) => setAmazon(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saving) {
                      event.preventDefault();
                      void handleSave();
                    }
                  }}
                  className="field-input"
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
                disabled={saving || !label.trim()}
                onClick={() => void handleSave()}
                className="btn-primary flex-1"
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
