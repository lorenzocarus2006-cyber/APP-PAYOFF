"use client";

import { useMemo, useState } from "react";
import type { ReceiverLink } from "@/lib/db";

type Props = {
  piattaforma: string; // es. COINBASE
  color: string;
  initial: ReceiverLink[];
};

/** Ordine: prima i NON ritirati (quelli da completare) per count desc,
 *  in fondo i già ritirati (completati). I conteggi 0 chiudono la lista. */
function sortReceivers(list: ReceiverLink[]): ReceiverLink[] {
  return [...list].sort((a, b) => {
    const aHas = a.count > 0;
    const bHas = b.count > 0;
    if (aHas !== bHas) return aHas ? -1 : 1; // chi ha link prima
    if (a.ritirato !== b.ritirato) return a.ritirato ? 1 : -1; // non ritirati prima
    return b.count - a.count; // count desc
  });
}

export default function BonusReceivers({ piattaforma, color, initial }: Props) {
  const [items, setItems] = useState<ReceiverLink[]>(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const ordered = useMemo(() => sortReceivers(items), [items]);
  const max = useMemo(() => items.reduce((m, r) => Math.max(m, r.count), 0), [items]);

  async function toggle(ricevente: string, next: boolean) {
    setPending(ricevente);
    setError("");
    // optimistic
    setItems((prev) =>
      prev.map((r) => (r.ricevente === ricevente ? { ...r, ritirato: next } : r)),
    );
    try {
      const res = await fetch("/api/link/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ricevente, piattaforma, ritirato: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore aggiornamento.");
    } catch (err) {
      // rollback
      setItems((prev) =>
        prev.map((r) => (r.ricevente === ricevente ? { ...r, ritirato: !next } : r)),
      );
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {ordered.map((row, index) => {
          const active = row.count > 0;
          const pct = max > 0 ? (row.count / max) * 100 : 0;
          const busy = pending === row.ricevente;
          return (
            <li
              key={row.ricevente}
              className="animate-[fadeSlide_0.35s_ease_both]"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <div
                className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 backdrop-blur-[20px] ${
                  active ? "border-white/20 bg-white/10" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {active && !row.ritirato ? (
                  <span
                    className="absolute inset-y-0 left-0 z-0 rounded-2xl opacity-25"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                ) : null}

                {/* pin verde/rosso */}
                <span
                  className={`relative z-10 h-3 w-3 shrink-0 rounded-full ${
                    !active ? "bg-white/20" : row.ritirato ? "bg-emerald-400" : "bg-red-400"
                  }`}
                  style={
                    active
                      ? {
                          boxShadow: row.ritirato
                            ? "0 0 8px 1px rgba(52,211,153,0.7)"
                            : "0 0 8px 1px rgba(248,113,113,0.8)",
                        }
                      : undefined
                  }
                  title={!active ? "Nessun link" : row.ritirato ? "Ritirati" : "Da ritirare"}
                />

                <span
                  className={`relative z-10 min-w-0 flex-1 truncate text-base font-semibold ${
                    active ? "text-white" : "text-white/45"
                  }`}
                >
                  {row.ricevente}
                </span>

                <span
                  className="relative z-10 grid min-w-9 place-items-center rounded-full px-3 py-1 text-base font-bold tabular-nums text-white"
                  style={{ backgroundColor: active ? color : "rgba(255,255,255,0.12)" }}
                >
                  {row.count}
                </span>

                {/* toggle ritirato */}
                <button
                  type="button"
                  disabled={!active || busy}
                  onClick={() => toggle(row.ricevente, !row.ritirato)}
                  aria-pressed={row.ritirato}
                  className={`relative z-10 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-30 ${
                    row.ritirato
                      ? "justify-end border-emerald-300/50 bg-emerald-400/80"
                      : "justify-start border-white/30 bg-white/15"
                  }`}
                  title={row.ritirato ? "Segna come da ritirare" : "Segna come ritirato"}
                >
                  <span className="mx-0.5 h-6 w-6 rounded-full bg-white shadow" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
