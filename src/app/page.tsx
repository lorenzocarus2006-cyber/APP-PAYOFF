"use client";

import { useEffect, useMemo, useState } from "react";
import { AFFILIATES, PLATFORMS, RECEIVERS, STATUSES } from "@/config/dropdowns";
import type { BonusRecord, NewBonusPayload } from "@/lib/types";

const defaultForm: NewBonusPayload = {
  piattaforma: PLATFORMS[0],
  personaInvitata: "",
  stato: STATUSES[0],
  ricevente: "",
  data: "",
  info: "",
  affiliati: "",
  bonus: 0,
  spese: 0,
  amazon: 0,
};

function statusBadge(status: string) {
  if (status === "Bonus arrivato") return "bg-emerald-100 text-emerald-700";
  if (status === "Bonus in arrivo") return "bg-yellow-100 text-yellow-700";
  if (status === "Registrato da completare") return "bg-violet-100 text-violet-700";
  return "bg-red-100 text-red-700";
}

const PLATFORM_COLORS: Record<string, string> = {
  COINBASE: "#0052FF",
  REVOLUT: "#1A1A2E",
  ING: "#FF6200",
  ISYBANK: "#FF6B35",
  BBVA: "#004481",
  BUDDYBANK: "#FF4B7B",
  BINANCE: "#F0B90B",
  KRAKEN: "#5741D9",
};

function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#2D7DD2";
}

function PayoffWordmark() {
  return (
    <div className="mx-auto flex w-[200px] items-center justify-center gap-2">
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
        <path
          d="M24 3L40.5 12.5V31.5L24 41L7.5 31.5V12.5L24 3Z"
          stroke="#ffffff"
          strokeWidth="3"
        />
        <path
          d="M24 12L31.5 16.3V24.9L24 29.2L16.5 24.9V16.3L24 12Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </svg>
      <span className="text-3xl font-extrabold tracking-wide text-white">PAYOFF</span>
    </div>
  );
}

export default function HomePage() {
  const [rows, setRows] = useState<BonusRecord[]>([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewBonusPayload>(defaultForm);
  const [loadingRead, setLoadingRead] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [infoDrafts, setInfoDrafts] = useState<Record<number, string>>({});
  const [infoSavedRow, setInfoSavedRow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const nettoForm = form.bonus - form.spese - form.amazon;

  async function fetchRows() {
    setLoadingRead(true);
    setError("");
    try {
      const res = await fetch("/api/sheets/read", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore lettura dati.");
      const nextRows: BonusRecord[] = data.rows ?? [];
      setRows(nextRows);
      setInfoDrafts(
        nextRows.reduce<Record<number, string>>((acc, row) => {
          acc[row.rowNumber] = row.info ?? "";
          return acc;
        }, {}),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoadingRead(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return rows.filter((row) => row.personaInvitata.toLowerCase().includes(term));
  }, [rows, query]);

  async function handleSaveBonus() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/sheets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossibile salvare il bonus.");

      setSuccess("Bonus salvato con successo.");
      setForm(defaultForm);
      setShowModal(false);
      await fetchRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineUpdate(
    row: BonusRecord,
    field:
      | "stato"
      | "ricevente"
      | "affiliati"
      | "bonus"
      | "spese"
      | "amazon"
      | "info",
    value: string | number,
  ): Promise<boolean> {
    const colByField: Record<typeof field, string> = {
      stato: "C",
      ricevente: "D",
      affiliati: "G",
      bonus: "H",
      spese: "I",
      amazon: "J",
      info: "F",
    };
    const key = `${row.rowNumber}-${field}`;
    setUpdatingKey(key);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/sheets/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: row.rowNumber,
          col: colByField[field],
          value: String(value),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aggiornamento non riuscito.");

      setRows((prev) =>
        prev.map((item) =>
          item.rowNumber === row.rowNumber
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
    const nextInfo = (infoDrafts[row.rowNumber] ?? "").trim();
    if (nextInfo === row.info.trim()) return;

    const ok = await handleInlineUpdate(row, "info", nextInfo);
    if (!ok) return;

    setInfoSavedRow(row.rowNumber);
    setTimeout(() => {
      setInfoSavedRow((current) => (current === row.rowNumber ? null : current));
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-[#2D7DD2] px-5 py-5 text-[#1A1A2E]">
      <main className="mx-auto w-full space-y-5">
        <header className="space-y-3 pb-8 pt-10 text-center">
          <PayoffWordmark />
          <h1 className="text-[28px] font-extrabold leading-tight text-white">Ciao! 👋</h1>
          <p className="text-base text-white/60">Gestisci i tuoi bonus</p>
        </header>

        <section className="rounded-2xl bg-white p-5 text-[#1A1A2E] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-bold">Registra Nuovo Bonus</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Aggiungi una nuova riga al foglio.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#2D7DD2] to-[#5B9BD5] px-5 py-4 text-xl font-extrabold text-white shadow-[0_8px_20px_rgba(45,125,210,0.3)]"
          >
            ＋ Registra Nuovo Bonus
          </button>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="mb-3 text-xl font-bold">Cerca persona</h2>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
              🔍
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca persona..."
              className="min-h-14 w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-lg font-medium outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            {success}
          </div>
        ) : null}

        {query.trim().length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Risultati ({filteredRows.length})
            </h2>

            {loadingRead ? (
              <div className="rounded-2xl bg-white p-6 text-base text-[#6B7280] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                Caricamento righe in corso...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-base text-[#6B7280] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                Nessun risultato
              </div>
            ) : (
              filteredRows.map((row) => (
                <article
                  key={row.rowNumber}
                  className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                  style={{ borderLeft: `4px solid ${platformColor(row.piattaforma)}` }}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold">{row.personaInvitata || "(senza nome)"}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge(row.stato)}`}
                    >
                      {row.stato || "N/D"}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: platformColor(row.piattaforma) }}
                    >
                      {row.piattaforma || "PIATTAFORMA"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-base md:grid-cols-2">
                    <div>
                      <p className="text-[#6B7280]">Data</p>
                      <p className="font-semibold">{row.data || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[#6B7280]">Netto $</p>
                      <p className="text-xl font-extrabold text-[#2D7DD2]">
                        {row.netto.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[#6B7280]">STATO</span>
                    <select
                      value={row.stato}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "stato", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-stato`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    >
                      {STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#6B7280]">Ricevente</span>
                    <select
                      value={row.ricevente}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "ricevente", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-ricevente`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    >
                      <option value="">-</option>
                      {RECEIVERS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#6B7280]">AFFILIATI</span>
                    <select
                      value={row.affiliati}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "affiliati", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-affiliati`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    >
                      <option value="">-</option>
                      {AFFILIATES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">INFO</span>
                      {infoSavedRow === row.rowNumber ? (
                          <span className="text-sm font-semibold text-[#0066ff]">
                          ✓ Salvato
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      value={infoDrafts[row.rowNumber] ?? row.info}
                      onChange={(event) =>
                        setInfoDrafts((prev) => ({
                          ...prev,
                          [row.rowNumber]: event.target.value,
                        }))
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
                      disabled={updatingKey === `${row.rowNumber}-info`}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#6B7280]">Bonus $</span>
                    <input
                      type="number"
                      value={row.bonus}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "bonus",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.rowNumber}-bonus`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#6B7280]">Spese</span>
                    <input
                      type="number"
                      value={row.spese}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "spese",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.rowNumber}-spese`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[#6B7280]">Amazon</span>
                    <input
                      type="number"
                      value={row.amazon}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "amazon",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.rowNumber}-amazon`}
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                    />
                  </label>
                </div>
              </article>
              ))
            )}
          </section>
        ) : null}
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm">
          <div className="h-screen w-full overflow-y-auto bg-white p-5 sm:mx-auto sm:mt-4 sm:h-auto sm:max-h-[95vh] sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Registra nuovo bonus</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-base sm:text-lg">Piattaforma *</span>
                <select
                  value={form.piattaforma}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, piattaforma: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                >
                  {PLATFORMS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Persona invitata</span>
                <input
                  value={form.personaInvitata}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, personaInvitata: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">STATO *</span>
                <select
                  value={form.stato}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stato: event.target.value }))
                  }
                  className={`min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20 ${statusBadge(form.stato)}`}
                >
                  {STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Ricevente</span>
                <select
                  value={form.ricevente}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ricevente: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                >
                  <option value="">-</option>
                  {RECEIVERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, data: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">AFFILIATI</span>
                <select
                  value={form.affiliati}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliati: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                >
                  <option value="">-</option>
                  {AFFILIATES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-base sm:text-lg">INFO</span>
                <textarea
                  value={form.info}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, info: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                  rows={3}
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Bonus $</span>
                <input
                  type="number"
                  value={form.bonus}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bonus: Number(event.target.value || 0) }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Spese</span>
                <input
                  type="number"
                  value={form.spese}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, spese: Number(event.target.value || 0) }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Amazon</span>
                <input
                  type="number"
                  value={form.amazon}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amazon: Number(event.target.value || 0) }))
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/20"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Netto $ (auto)</span>
                <input
                  readOnly
                  value={nettoForm.toFixed(2)}
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-bold text-[#2D7DD2]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-12 rounded-2xl border border-slate-300 px-5 py-3 text-lg font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveBonus()}
                className="min-h-12 rounded-2xl bg-gradient-to-r from-[#2D7DD2] to-[#5B9BD5] px-5 py-3 text-lg font-bold text-white shadow-[0_8px_20px_rgba(45,125,210,0.3)] disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
