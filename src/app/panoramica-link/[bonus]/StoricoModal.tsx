"use client";

import { useEffect, useRef, useState } from "react";
import { statusColor } from "@/app/bilancio/shared";

type StoricoRow = {
  personaInvitata: string;
  data: string;
  stato: string;
  netto: number;
};

type Props = {
  piattaforma: string;
  ricevente: string;
  onClose: () => void;
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function StoricoModal({ piattaforma, ricevente, onClose }: Props) {
  const [rows, setRows] = useState<StoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/links/storico?piattaforma=${encodeURIComponent(piattaforma)}&ricevente=${encodeURIComponent(ricevente)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { rows?: StoricoRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento dello storico.");
        setRows(data.rows ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto.");
      } finally {
        setLoading(false);
      }
    })();
  }, [piattaforma, ricevente]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current == null) return;
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 80) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full flex-col rounded-t-[26px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:max-w-lg sm:rounded-[22px]"
        style={{ backgroundColor: "#0F1420" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-white/20 sm:hidden" />

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] p-5">
          <div>
            <h2 className="text-lg font-bold text-white">Storico — {ricevente}</h2>
            <p className="mt-1 text-sm text-white/50">
              {loading ? "Caricamento..." : `${rows.length} ${rows.length === 1 ? "persona" : "persone"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg font-bold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-white/40">Caricamento...</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Nessuno storico per questo link.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, index) => (
                <li
                  key={`${row.personaInvitata}-${row.data}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {row.personaInvitata || "—"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-white/45">{row.data}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: statusColor(row.stato) }}
                      >
                        {row.stato}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-white">
                    {money(row.netto)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.07] p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-2xl border border-white/40 bg-transparent text-base font-semibold text-white"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
