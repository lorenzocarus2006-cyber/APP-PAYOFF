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
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 md:px-8 md:py-10">
      <main className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6 md:space-y-7">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">PayOff</h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">
            Gestione bonus con Google Sheets
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold sm:text-2xl">Registra nuovo bonus</h2>
          <p className="mt-1 text-base text-slate-600 sm:text-lg">
            Aggiungi una nuova riga al foglio.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 min-h-12 w-full rounded-xl bg-[#0066ff] px-5 py-4 text-xl font-bold text-white transition hover:bg-[#0056d9]"
          >
            ＋ Registra Nuovo Bonus
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Cerca persona</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca persona..."
            className="min-h-14 w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-xl font-medium outline-none ring-[#007aff] placeholder:text-slate-400 focus:ring-2"
          />
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
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-base text-slate-600 shadow-sm sm:text-lg">
                Caricamento righe in corso...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-base text-slate-600 shadow-sm sm:text-lg">
                Nessun risultato
              </div>
            ) : (
              filteredRows.map((row) => (
                <article
                  key={row.rowNumber}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold sm:text-2xl">
                    {row.personaInvitata || "(senza nome)"}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge(row.stato)}`}
                  >
                    {row.stato || "N/D"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 text-base sm:text-lg md:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Piattaforma</p>
                    <p className="font-semibold">{row.piattaforma || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Data</p>
                    <p className="font-semibold">{row.data || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Netto $</p>
                    <p className="text-lg font-bold text-[#0066ff]">
                      {row.netto.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-slate-500 sm:text-lg">STATO</span>
                    <select
                      value={row.stato}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "stato", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-stato`}
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                    >
                      {STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-500 sm:text-lg">Ricevente</span>
                    <select
                      value={row.ricevente}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "ricevente", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-ricevente`}
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                    <span className="text-slate-500 sm:text-lg">AFFILIATI</span>
                    <select
                      value={row.affiliati}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "affiliati", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-affiliati`}
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                      <span className="text-slate-500 sm:text-lg">INFO</span>
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-500 sm:text-lg">Bonus $</span>
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
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-500 sm:text-lg">Spese</span>
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
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-500 sm:text-lg">Amazon</span>
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
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
        <div className="fixed inset-0 z-50 bg-slate-900/30 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="h-screen w-full overflow-y-auto bg-white p-5 sm:h-auto sm:max-h-[95vh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Registra nuovo bonus</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-base sm:text-lg">Piattaforma *</span>
                <select
                  value={form.piattaforma}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, piattaforma: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">STATO *</span>
                <select
                  value={form.stato}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stato: event.target.value }))
                  }
                  className={`min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg ${statusBadge(form.stato)}`}
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">AFFILIATI</span>
                <select
                  value={form.affiliati}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliati: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Netto $ (auto)</span>
                <input
                  readOnly
                  value={nettoForm.toFixed(2)}
                  className="min-h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-[#0066ff] sm:text-lg"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 text-lg font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveBonus()}
                className="min-h-12 rounded-xl bg-[#0066ff] px-5 py-3 text-lg font-bold text-white disabled:opacity-60"
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
