"use client";

import { useMemo, useState } from "react";
import type { ReceiverLinkDetail } from "@/lib/types";

type Props = {
  piattaforma: string; // es. COINBASE
  color: string;
  initial: ReceiverLinkDetail[];
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function sortByName(list: ReceiverLinkDetail[]) {
  return [...list].sort((a, b) => a.ricevente.localeCompare(b.ricevente, "it", { sensitivity: "base" }));
}

export default function ReceiverList({ piattaforma, color, initial }: Props) {
  const [items, setItems] = useState<ReceiverLinkDetail[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [ritiratiDrafts, setRitiratiDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const active = useMemo(() => sortByName(items.filter((r) => !r.maxed)), [items]);
  const maxed = useMemo(() => sortByName(items.filter((r) => r.maxed)), [items]);

  function draftLink(r: ReceiverLinkDetail) {
    return linkDrafts[r.ricevente] ?? r.linkOCodice;
  }
  function draftRitirati(r: ReceiverLinkDetail) {
    return ritiratiDrafts[r.ricevente] ?? String(r.soldiRitirati);
  }

  async function toggleMaxed(ricevente: string, next: boolean) {
    setError("");
    setItems((prev) => prev.map((r) => (r.ricevente === ricevente ? { ...r, maxed: next } : r)));
    try {
      const res = await fetch("/api/link/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ricevente, piattaforma, maxed: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore aggiornamento.");
    } catch (err) {
      setItems((prev) => prev.map((r) => (r.ricevente === ricevente ? { ...r, maxed: !next } : r)));
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    }
  }

  async function saveLink(r: ReceiverLinkDetail) {
    const value = (linkDrafts[r.ricevente] ?? r.linkOCodice).trim();
    if (value === r.linkOCodice) return;
    setBusy(`${r.ricevente}-link`);
    setError("");
    try {
      const res = await fetch("/api/links/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piattaforma, intestatario: r.ricevente, url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio link.");
      setItems((prev) =>
        prev.map((item) =>
          item.ricevente === r.ricevente ? { ...item, linkOCodice: value } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRitirati(r: ReceiverLinkDetail) {
    const raw = ritiratiDrafts[r.ricevente];
    if (raw === undefined) return;
    const value = Number(raw.replace(",", ".")) || 0;
    if (value === r.soldiRitirati) return;
    setBusy(`${r.ricevente}-ritirati`);
    setError("");
    try {
      const res = await fetch("/api/link/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ricevente: r.ricevente, piattaforma, soldiRitirati: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio.");
      setItems((prev) =>
        prev.map((item) =>
          item.ricevente === r.ricevente
            ? { ...item, soldiRitirati: value, soldiDaPrelevare: item.soldiSulConto - value }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(r: ReceiverLinkDetail) {
    const value = draftLink(r);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(r.ricevente);
      setTimeout(() => setCopied((cur) => (cur === r.ricevente ? null : cur)), 1500);
    } catch {
      setError("Impossibile copiare negli appunti.");
    }
  }

  function renderCard(r: ReceiverLinkDetail, dimmed: boolean) {
    const isOpen = expanded === r.ricevente;
    const daPrelevare =
      (Number(draftRitirati(r).replace(",", ".")) || 0) === r.soldiRitirati
        ? r.soldiDaPrelevare
        : r.soldiSulConto - (Number(draftRitirati(r).replace(",", ".")) || 0);

    return (
      <li
        key={r.ricevente}
        className={`overflow-hidden rounded-2xl border transition-opacity ${
          dimmed ? "border-white/10 bg-white/[0.04] opacity-60" : "border-white/10 bg-white/[0.04]"
        }`}
      >
        <div className="flex items-center gap-3 p-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: dimmed ? "rgba(255,255,255,0.15)" : color }}
          >
            {r.ricevente.slice(0, 2).toUpperCase()}
          </span>

          <span className="min-w-0 flex-1 truncate text-base font-semibold text-white">
            {r.ricevente}
          </span>

          <span
            className="grid min-w-9 place-items-center rounded-full px-3 py-1 text-base font-bold tabular-nums text-white"
            style={{ backgroundColor: dimmed ? "rgba(255,255,255,0.12)" : color }}
          >
            {r.count}
          </span>

          {/* toggle maxed */}
          <button
            type="button"
            onClick={() => void toggleMaxed(r.ricevente, !r.maxed)}
            aria-pressed={r.maxed}
            className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
              r.maxed
                ? "justify-end border-emerald-300/50 bg-emerald-400/80"
                : "justify-start border-white/10 bg-white/[0.06]"
            }`}
            title={r.maxed ? "Segna come non maxato" : "Segna come maxato"}
          >
            <span className="mx-0.5 h-6 w-6 rounded-full bg-white shadow" />
          </button>

          <button
            type="button"
            aria-label={isOpen ? "Comprimi" : "Espandi"}
            onClick={() => setExpanded(isOpen ? null : r.ricevente)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {isOpen ? (
          <div className="animate-[fadeSlide_0.25s_ease_both] space-y-3 border-t border-white/10 p-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-white/60">Link o codice</span>
              <div className="flex gap-2">
                <input
                  value={draftLink(r)}
                  onChange={(event) =>
                    setLinkDrafts((prev) => ({ ...prev, [r.ricevente]: event.target.value }))
                  }
                  onBlur={() => void saveLink(r)}
                  placeholder="https://... oppure codice invito"
                  disabled={busy === `${r.ricevente}-link`}
                  className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white outline-none placeholder:text-white/40 focus:border-white/50 focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => void copyLink(r)}
                  disabled={!draftLink(r)}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                >
                  {copied === r.ricevente ? "✓ Copiato" : "Copia"}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                <p className="text-[11px] text-white/60">Soldi sul conto</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
                  {money(r.soldiSulConto)}
                </p>
              </div>

              <label className="block space-y-1 rounded-xl border border-white/15 bg-white/8 p-3">
                <span className="text-[11px] text-white/60">Soldi ritirati</span>
                <input
                  type="number"
                  value={draftRitirati(r)}
                  onChange={(event) =>
                    setRitiratiDrafts((prev) => ({ ...prev, [r.ricevente]: event.target.value }))
                  }
                  onBlur={() => void saveRitirati(r)}
                  disabled={busy === `${r.ricevente}-ritirati`}
                  className="min-h-8 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-lg font-bold tabular-nums text-white outline-none focus:border-white/50"
                />
              </label>

              <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                <p className="text-[11px] text-white/60">Soldi da prelevare</p>
                <p
                  className={`mt-0.5 text-lg font-bold tabular-nums ${
                    daPrelevare > 0 ? "text-emerald-300" : "text-white"
                  }`}
                >
                  {money(daPrelevare)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {active.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 text-sm text-white/60">
          Nessun ricevente attivo. Aggiungi un link per farlo comparire qui.
        </div>
      ) : (
        <ul className="space-y-2.5">{active.map((r) => renderCard(r, false))}</ul>
      )}

      {maxed.length > 0 ? (
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-semibold uppercase tracking-wide text-white/50">
            Link maxxati ({maxed.length})
          </h2>
          <ul className="space-y-2.5">{maxed.map((r) => renderCard(r, true))}</ul>
        </div>
      ) : null}
    </>
  );
}
