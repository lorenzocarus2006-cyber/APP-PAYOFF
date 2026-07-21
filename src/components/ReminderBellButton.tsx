"use client";

import { useState } from "react";
import { todayISO } from "@/lib/date";

type Props = {
  bonusId: number;
  label: string;
  variant?: "icon" | "button";
  onSaved?: () => void;
};

/** Bottone 🔔 riusabile: apre un piccolo form (data + descrizione) e crea un promemoria legato a un bonus. */
export default function ReminderBellButton({ bonusId, label, variant = "icon", onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(todayISO());
  const [descrizione, setDescrizione] = useState("");
  const [saved, setSaved] = useState(false);

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  async function handleSave() {
    if (!descrizione.trim()) {
      setError("Inserisci una descrizione.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/promemoria/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusId, dataPromemoria: data, descrizione: descrizione.trim() }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Errore salvataggio promemoria.");

      setOpen(false);
      setData(todayISO());
      setDescrizione("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Aggiungi promemoria"
          onClick={() => setOpen(true)}
          className="text-lg opacity-70 transition-opacity hover:opacity-100"
        >
          {saved ? "✅" : "🔔"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-white/25"
        >
          {saved ? "✅ Promemoria aggiunto" : "🔔 Aggiungi promemoria"}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
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
            <h2 className="text-xl font-bold text-white">🔔 Nuovo promemoria</h2>
            <p className="mt-1 text-sm text-white/70">{label}</p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-white/80">Data</span>
                <input
                  type="date"
                  value={data}
                  onChange={(event) => setData(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base font-semibold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-white/80">Cosa fare</span>
                <textarea
                  value={descrizione}
                  onChange={(event) => setDescrizione(event.target.value)}
                  autoFocus
                  rows={3}
                  placeholder="Es. Controllare se il bonus è arrivato"
                  className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base font-semibold text-white outline-none placeholder:text-white/40 focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
                disabled={saving || !descrizione.trim()}
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
