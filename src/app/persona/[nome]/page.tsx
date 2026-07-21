"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { AFFILIATES, RECEIVERS, STATUSES } from "@/config/dropdowns";
import ReminderBellButton from "@/components/ReminderBellButton";
import type { BonusRecord } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Bonus arrivato": "#16A34A",
  "Bonus in arrivo": "#D97706",
  "Registrato da completare": "#7C3AED",
  FAIL: "#DC2626",
};

const PLATFORM_COLORS: Record<string, string> = {
  COINBASE: "#0052FF",
  REVOLUT: "#374151",
  ING: "#FF6200",
  ISYBANK: "#FF6B35",
  BBVA: "#004481",
  BUDDYBANK: "#FF4B7B",
  BINANCE: "#D4A017",
  KRAKEN: "#5741D9",
  MYFIN: "#0D9488",
};

function statusColor(stato: string) {
  return STATUS_COLORS[stato] ?? "#6B7280";
}

function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#2D7DD2";
}

type DeleteConfirm = { id: number; piattaforma: string };

export default function PersonaPage() {
  const params = useParams<{ nome: string }>();
  const nome = decodeURIComponent(params.nome ?? "");
  const target = nome.trim().toLowerCase();

  const [rows, setRows] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [error, setError] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [infoDrafts, setInfoDrafts] = useState<Record<number, string>>({});
  const [infoSavedRow, setInfoSavedRow] = useState<number | null>(null);
  const [affiliatiRoster, setAffiliatiRoster] = useState<string[]>([...AFFILIATES]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchRows() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sheets/read", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore lettura dati.");
      const allRows: BonusRecord[] = data.rows ?? [];
      const personRows = allRows.filter(
        (row) => (row.personaInvitata.trim() || "(senza nome)").toLowerCase() === target,
      );
      if (personRows.length === 0) {
        setNotFoundError(true);
      } else {
        setNotFoundError(false);
      }
      setRows(personRows);
      setInfoDrafts(
        personRows.reduce<Record<number, string>>((acc, row) => {
          acc[row.id] = row.info ?? "";
          return acc;
        }, {}),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/affiliati/read", { cache: "no-store" });
        const data = (await res.json()) as { roster?: string[] };
        if (res.ok && data.roster?.length) setAffiliatiRoster(data.roster);
      } catch {
        // mantiene il fallback AFFILIATES
      }
    })();
  }, []);

  async function handleInlineUpdate(
    row: BonusRecord,
    field: "stato" | "ricevente" | "affiliati" | "bonus" | "spese" | "amazon" | "info",
    value: string | number,
  ): Promise<boolean> {
    const key = `${row.id}-${field}`;
    setUpdatingKey(key);
    setError("");

    try {
      const res = await fetch("/api/sheets/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          field,
          value:
            field === "bonus" || field === "spese" || field === "amazon"
              ? Number(value) || 0
              : String(value),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aggiornamento non riuscito.");

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                [field]:
                  field === "bonus" || field === "spese" || field === "amazon"
                    ? Number(value) || 0
                    : value,
              }
            : item,
        ),
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
      return false;
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleInfoSave(row: BonusRecord) {
    const nextInfo = (infoDrafts[row.id] ?? "").trim();
    if (nextInfo === row.info.trim()) return;

    const ok = await handleInlineUpdate(row, "info", nextInfo);
    if (!ok) return;

    setInfoSavedRow(row.id);
    setTimeout(() => {
      setInfoSavedRow((current) => (current === row.id ? null : current));
    }, 1500);
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const deletedId = deleteConfirm.id;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/sheets/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eliminazione non riuscita.");

      setDeleteConfirm(null);
      setRows((prev) => prev.filter((r) => r.id !== deletedId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const totalNetto = useMemo(() => rows.reduce((sum, row) => sum + row.netto, 0), [rows]);
  const totalBonus = useMemo(() => rows.reduce((sum, row) => sum + row.bonus, 0), [rows]);
  const statusBreakdown = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, row) => {
        const key = row.stato || "—";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [rows],
  );

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Cerca
        </Link>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-base text-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Caricamento bonus in corso...
          </div>
        ) : notFoundError ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-base text-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Nessun bonus trovato per &quot;{nome}&quot;.
          </div>
        ) : (
          <>
            <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold uppercase">
                  {nome.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Profilo
                  </p>
                  <h1 className="truncate text-2xl font-bold tracking-tight">{nome}</h1>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
                  <p className="text-3xl font-bold tabular-nums leading-none">
                    {totalNetto.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-white/60">netto $ totale</p>
                </div>
                <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
                  <p className="text-3xl font-bold tabular-nums leading-none">{rows.length}</p>
                  <p className="mt-1 text-xs text-white/60">bonus · {totalBonus.toFixed(0)}$ lordo</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(statusBreakdown).map(([stato, count]) => (
                  <span
                    key={stato}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusColor(stato) }}
                    />
                    {stato} · {count}
                  </span>
                ))}
              </div>
            </header>

            <ul className="space-y-3">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className="relative animate-[fadeSlide_0.4s_ease_both] overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] p-5 pt-12 text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    borderLeft: `4px solid ${platformColor(row.piattaforma)}`,
                  }}
                >
                  <div className="absolute left-4 top-4 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Elimina bonus"
                      className="grid h-8 w-8 place-items-center rounded-full text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      onClick={() =>
                        setDeleteConfirm({ id: row.id, piattaforma: row.piattaforma || "" })
                      }
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                    <ReminderBellButton
                      link={{ type: "bonus", id: row.id }}
                      label={`${row.piattaforma || "Bonus"} · ${nome || "(senza nome)"}`}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="ml-auto rounded-full px-3 py-1 text-sm font-bold text-white"
                      style={{ backgroundColor: platformColor(row.piattaforma) }}
                    >
                      {row.piattaforma || "—"}
                    </span>
                    <span className="text-2xl font-bold leading-none tabular-nums">
                      {row.netto.toFixed(2)}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-white/50">Data</p>
                  <p className="text-[15px] font-black text-white">{row.data || "—"}</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">STATO</span>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                          style={{ backgroundColor: statusColor(row.stato) }}
                        />
                        <select
                          value={row.stato}
                          onChange={(event) =>
                            void handleInlineUpdate(row, "stato", event.target.value)
                          }
                          disabled={updatingKey === `${row.id}-stato`}
                          className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-9 text-[15px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status} className="bg-[#11141C] text-white">
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Ricevente</span>
                      <select
                        value={row.ricevente}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "ricevente", event.target.value)
                        }
                        disabled={updatingKey === `${row.id}-ricevente`}
                        className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      >
                        <option value="" className="bg-[#11141C] text-white">-</option>
                        {RECEIVERS.map((option) => (
                          <option key={option} value={option} className="bg-[#11141C] text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">AFFILIATI</span>
                      <select
                        value={row.affiliati}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "affiliati", event.target.value)
                        }
                        disabled={updatingKey === `${row.id}-affiliati`}
                        className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      >
                        <option value="" className="bg-[#11141C] text-white">-</option>
                        {affiliatiRoster.map((option) => (
                          <option key={option} value={option} className="bg-[#11141C] text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 md:col-span-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">INFO</span>
                        {infoSavedRow === row.id ? (
                          <span className="text-sm font-semibold text-emerald-300">
                            ✓ Salvato
                          </span>
                        ) : null}
                      </div>
                      <textarea
                        value={infoDrafts[row.id] ?? row.info}
                        onChange={(event) =>
                          setInfoDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                        onBlur={() => {
                          void handleInfoSave(row);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        disabled={updatingKey === `${row.id}-info`}
                        rows={2}
                        className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Bonus $</span>
                      <input
                        type="number"
                        value={row.bonus}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "bonus", Number(event.target.value || 0))
                        }
                        disabled={updatingKey === `${row.id}-bonus`}
                        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Spese</span>
                      <input
                        type="number"
                        value={row.spese}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "spese", Number(event.target.value || 0))
                        }
                        disabled={updatingKey === `${row.id}-spese`}
                        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Amazon</span>
                      <input
                        type="number"
                        value={row.amazon}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "amazon", Number(event.target.value || 0))
                        }
                        disabled={updatingKey === `${row.id}-amazon`}
                        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {deleteConfirm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteConfirm(null);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-[20px] font-bold text-neutral-900">Elimina bonus?</h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-700">
              Sei sicuro di voler eliminare il bonus su{" "}
              <span className="font-semibold">{deleteConfirm.piattaforma.trim() || "—"}</span>?
              Questa azione non può essere annullata.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete();
                }}
                className="min-h-12 rounded-xl bg-[#DC2626] px-5 py-3 text-base font-bold text-white disabled:opacity-60"
              >
                {deleting ? "Eliminazione..." : "Elimina"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(null);
                }}
                className="min-h-12 rounded-xl bg-neutral-200 px-5 py-3 text-base font-bold text-neutral-800 disabled:opacity-60"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
