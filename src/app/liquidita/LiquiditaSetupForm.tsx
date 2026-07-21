"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { todayISO } from "@/lib/date";
import type { LiquiditaConfig } from "@/lib/types";

type Props = {
  config: LiquiditaConfig | null;
};

export default function LiquiditaSetupForm({ config }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [valoreIniziale, setValoreIniziale] = useState(
    config ? String(config.valoreIniziale) : "",
  );
  const [dataAttivazione, setDataAttivazione] = useState(config?.dataAttivazione ?? todayISO());

  async function handleSave() {
    const valore = Number(valoreIniziale.replace(",", "."));
    if (!Number.isFinite(valore)) {
      setError("Inserisci un valore iniziale valido.");
      return;
    }
    if (!dataAttivazione) {
      setError("Inserisci la data di attivazione.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/liquidita/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valoreIniziale: valore, dataAttivazione }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore durante il salvataggio.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary w-full"
      >
        ✏️ Modifica valore iniziale
      </button>
    );
  }

  return (
    <div className="surface-card space-y-4 p-5">
      <p className="page-eyebrow">
        {config ? "Modifica configurazione" : "Configurazione iniziale"}
      </p>

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="field-label">Valore iniziale ($)</span>
        <input
          type="number"
          value={valoreIniziale}
          onChange={(event) => setValoreIniziale(event.target.value)}
          placeholder="0.00"
          className="field-input"
        />
      </label>

      <label className="block space-y-1">
        <span className="field-label">Data di attivazione</span>
        <input
          type="date"
          value={dataAttivazione}
          onChange={(event) => setDataAttivazione(event.target.value)}
          className="field-input"
        />
        <span className="block text-xs text-white/40">
          Le spese dei bonus vengono dedotte solo da questa data in poi.
        </span>
      </label>

      <div className="flex gap-3">
        {config ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => setOpen(false)}
            className="btn-secondary flex-1"
          >
            Annulla
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="btn-primary flex-1"
        >
          {saving ? "Salvataggio..." : "Salva"}
        </button>
      </div>
    </div>
  );
}
