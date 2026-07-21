"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATUSES } from "@/config/dropdowns";
import type { BonusRecord } from "@/lib/types";
import { money, platformColor } from "./shared";

type Props = {
  title: string;
  subtitle: string;
  rows: BonusRecord[];
  onClose: () => void;
};

export default function BonusListModal({ title, subtitle, rows, onClose }: Props) {
  const [items, setItems] = useState(rows);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleStatusChange(row: BonusRecord, value: string) {
    setUpdatingId(row.id);
    setError("");
    try {
      const res = await fetch("/api/sheets/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, field: "stato", value }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore durante l'aggiornamento.");
      setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, stato: value } : item)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
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
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] p-5">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/50">{subtitle}</p>
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
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Nessun bonus in questa lista.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/persona/${encodeURIComponent(row.personaInvitata)}`}
                        className="block truncate text-base font-bold text-[#7ea0ff] underline-offset-2 hover:underline"
                      >
                        {row.personaInvitata || "—"}
                      </Link>
                      <span
                        className="mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white"
                        style={{ background: platformColor(row.piattaforma.toUpperCase()) }}
                      >
                        {row.piattaforma}
                      </span>
                    </div>
                    <p className="shrink-0 text-lg font-extrabold text-white">{money(row.netto)}</p>
                  </div>

                  <label className="mt-3 block space-y-1">
                    <span className="field-label">Stato</span>
                    <select
                      value={row.stato}
                      disabled={updatingId === row.id}
                      onChange={(event) => void handleStatusChange(row, event.target.value)}
                      className="field-select min-h-11 py-2 text-sm disabled:opacity-60"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-[#0F1420] text-white">
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
