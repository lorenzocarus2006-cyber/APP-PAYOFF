"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReceiverLinkDetail } from "@/lib/types";
import StoricoModal from "./StoricoModal";

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
  const router = useRouter();
  const [items, setItems] = useState<ReceiverLinkDetail[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [prelievoOpen, setPrelievoOpen] = useState<string | null>(null);
  const [prelievoImporto, setPrelievoImporto] = useState<Record<string, string>>({});
  const [prelievoNota, setPrelievoNota] = useState<Record<string, string>>({});

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; ricevente: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [storicoFor, setStoricoFor] = useState<string | null>(null);

  const maxedStorageKey = `link-maxxati-open-${piattaforma}`;
  const [maxedOpen, setMaxedOpen] = useState(false);
  useEffect(() => {
    setMaxedOpen(sessionStorage.getItem(maxedStorageKey) === "1");
  }, [maxedStorageKey]);

  function toggleMaxedOpen() {
    setMaxedOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem(maxedStorageKey, next ? "1" : "0");
      return next;
    });
  }

  const active = useMemo(() => sortByName(items.filter((r) => !r.maxed)), [items]);
  const maxed = useMemo(() => sortByName(items.filter((r) => r.maxed)), [items]);

  function draftLink(r: ReceiverLinkDetail) {
    return linkDrafts[r.ricevente] ?? r.linkOCodice;
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
      const savedLink = data.link as { id: number; url: string } | undefined;
      setItems((prev) =>
        prev.map((item) => {
          if (item.ricevente !== r.ricevente) return item;
          if (!savedLink) return { ...item, linkOCodice: value };
          const withoutSaved = item.links.filter((l) => l.id !== savedLink.id);
          return {
            ...item,
            linkOCodice: value,
            links: [{ id: savedLink.id, url: savedLink.url }, ...withoutSaved],
          };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDeleteLink() {
    if (!deleteConfirm) return;
    const { id, ricevente } = deleteConfirm;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch("/api/links/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore durante l'eliminazione del link.");
      setItems((prev) =>
        prev.map((item) =>
          item.ricevente === ricevente
            ? {
                ...item,
                links: item.links.filter((l) => l.id !== id),
                linkOCodice: item.links.filter((l) => l.id !== id)[0]?.url ?? "",
              }
            : item,
        ),
      );
      setDeleteConfirm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitPrelievo(r: ReceiverLinkDetail) {
    const raw = prelievoImporto[r.ricevente] ?? "";
    const importo = Number(raw.replace(",", "."));
    if (!Number.isFinite(importo) || importo <= 0) {
      setError("Inserisci un importo valido per il prelievo.");
      return;
    }
    setBusy(`${r.ricevente}-prelievo`);
    setError("");
    try {
      const res = await fetch("/api/liquidita/prelievo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piattaforma,
          ricevente: r.ricevente,
          importo,
          nota: prelievoNota[r.ricevente] ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore registrazione prelievo.");
      setItems((prev) =>
        prev.map((item) =>
          item.ricevente === r.ricevente
            ? {
                ...item,
                soldiRitirati: item.soldiRitirati + importo,
                soldiDaPrelevare: item.soldiSulConto - (item.soldiRitirati + importo),
              }
            : item,
        ),
      );
      setPrelievoImporto((prev) => ({ ...prev, [r.ricevente]: "" }));
      setPrelievoNota((prev) => ({ ...prev, [r.ricevente]: "" }));
      setPrelievoOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(value: string, copyKey: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(copyKey);
      setTimeout(() => setCopied((cur) => (cur === copyKey ? null : cur)), 1500);
    } catch {
      setError("Impossibile copiare negli appunti.");
    }
  }

  function renderCard(r: ReceiverLinkDetail, dimmed: boolean) {
    const isOpen = expanded === r.ricevente;
    const isPrelievoOpen = prelievoOpen === r.ricevente;

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
                  onClick={() => void copyLink(draftLink(r), `${r.ricevente}-primary`)}
                  disabled={!draftLink(r)}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                >
                  {copied === `${r.ricevente}-primary` ? "✓ Copiato" : "Copia"}
                </button>
              </div>
            </label>

            {r.links.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-white/60">
                  Tutti i link ({r.links.length})
                </span>
                <ul className="space-y-1.5">
                  {r.links.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2"
                    >
                      {link.url ? (
                        <span className="min-w-0 flex-1 truncate text-xs text-white/70">
                          {link.url}
                        </span>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-xs italic text-white/35">
                          Nessun link
                        </span>
                      )}
                      {link.url ? (
                        <button
                          type="button"
                          onClick={() => void copyLink(link.url, `link-${link.id}`)}
                          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/15"
                        >
                          {copied === `link-${link.id}` ? "✓" : "Copia"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Elimina link"
                        onClick={() => setDeleteConfirm({ id: link.id, ricevente: r.ricevente })}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/35 transition-colors hover:bg-red-500/15 hover:text-red-300 active:scale-95"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                <p className="text-[11px] text-white/60">Soldi sul conto</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
                  {money(r.soldiSulConto)}
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                <p className="text-[11px] text-white/60">Soldi ritirati</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
                  {money(r.soldiRitirati)}
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                <p className="text-[11px] text-white/60">Soldi da prelevare</p>
                <p
                  className={`mt-0.5 text-lg font-bold tabular-nums ${
                    r.soldiDaPrelevare > 0 ? "text-emerald-300" : "text-white"
                  }`}
                >
                  {money(r.soldiDaPrelevare)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStoricoFor(r.ricevente)}
              className="text-xs font-semibold text-white/50 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white/80"
            >
              Vedi storico
            </button>

            {isPrelievoOpen ? (
              <div className="animate-[fadeSlide_0.2s_ease_both] space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-white/60">Importo prelevato ($)</span>
                  <input
                    type="number"
                    autoFocus
                    value={prelievoImporto[r.ricevente] ?? ""}
                    onChange={(event) =>
                      setPrelievoImporto((prev) => ({ ...prev, [r.ricevente]: event.target.value }))
                    }
                    placeholder="0.00"
                    disabled={busy === `${r.ricevente}-prelievo`}
                    className="min-h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-base font-bold tabular-nums text-white outline-none focus:border-emerald-300/60"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-white/60">Nota (opzionale)</span>
                  <input
                    value={prelievoNota[r.ricevente] ?? ""}
                    onChange={(event) =>
                      setPrelievoNota((prev) => ({ ...prev, [r.ricevente]: event.target.value }))
                    }
                    placeholder="Es. Bonifico su conto personale"
                    disabled={busy === `${r.ricevente}-prelievo`}
                    className="min-h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-300/60"
                  />
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy === `${r.ricevente}-prelievo`}
                    onClick={() => setPrelievoOpen(null)}
                    className="min-h-9 flex-1 rounded-lg border border-white/10 bg-transparent text-sm font-semibold text-white/80 disabled:opacity-60"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={busy === `${r.ricevente}-prelievo`}
                    onClick={() => void submitPrelievo(r)}
                    className="min-h-9 flex-1 rounded-lg bg-emerald-500 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {busy === `${r.ricevente}-prelievo` ? "Salvataggio..." : "Conferma prelievo"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPrelievoOpen(r.ricevente)}
                className="btn-secondary w-full !min-h-10 text-sm"
              >
                💵 Registra prelievo
              </button>
            )}
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
          <button
            type="button"
            onClick={toggleMaxedOpen}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-base font-semibold uppercase tracking-wide text-white/60 transition-colors hover:bg-white/[0.08]"
          >
            <span>Link maxxati ({maxed.length})</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-5 w-5 text-white/50 transition-transform duration-300 ${
                maxedOpen ? "rotate-180" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {maxedOpen ? (
            <ul className="animate-[fadeSlide_0.25s_ease_both] space-y-2.5">
              {maxed.map((r) => renderCard(r, true))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {deleteConfirm ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && deletingId === null) setDeleteConfirm(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0F1420] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          >
            <h2 className="text-lg font-bold text-white">Eliminare questo link?</h2>
            <p className="mt-2 text-sm text-white/70">L&apos;operazione non è reversibile.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setDeleteConfirm(null)}
                className="min-h-12 flex-1 rounded-2xl border border-white/40 bg-transparent px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => void confirmDeleteLink()}
                className="min-h-12 flex-1 rounded-2xl bg-red-600 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId !== null ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {storicoFor ? (
        <StoricoModal
          piattaforma={piattaforma}
          ricevente={storicoFor}
          onClose={() => setStoricoFor(null)}
        />
      ) : null}
    </>
  );
}
