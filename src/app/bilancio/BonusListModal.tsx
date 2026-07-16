"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUSES } from "@/config/dropdowns";
import type { BonusRecord } from "@/lib/types";
import { money, platformColor, statusOptionStyle, statusSelectStyle } from "./shared";

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
        className="flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition-colors hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nessun bonus in questa lista.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/persona/${encodeURIComponent(row.personaInvitata)}`}
                        className="block truncate text-base font-bold text-[#2D5BE3] underline-offset-2 hover:underline"
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
                    <p className="shrink-0 text-lg font-extrabold text-slate-900">{money(row.netto)}</p>
                  </div>

                  <label className="mt-3 block space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Stato
                    </span>
                    <select
                      value={row.stato}
                      disabled={updatingId === row.id}
                      onChange={(event) => void handleStatusChange(row, event.target.value)}
                      className={`min-h-11 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-black/20 ${statusSelectStyle(row.stato)}`}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status} style={statusOptionStyle(status)}>
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
