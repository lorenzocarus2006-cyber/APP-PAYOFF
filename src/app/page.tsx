"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AFFILIATES, PLATFORMS, RECEIVERS, STATUSES } from "@/config/dropdowns";
import type { BonusRecord, NewBonusPayload } from "@/lib/types";

type BonusFormState = Omit<NewBonusPayload, "bonus" | "spese" | "amazon"> & {
  bonus: string;
  spese: string;
  amazon: string;
};

const defaultForm: BonusFormState = {
  piattaforma: PLATFORMS[0],
  personaInvitata: "",
  stato: STATUSES[0],
  ricevente: "",
  data: "",
  info: "",
  affiliati: "",
  bonus: "",
  spese: "",
  amazon: "",
};

function statusBadge(status: string) {
  if (status === "Bonus arrivato") return "bg-[#16A34A] text-white";
  if (status === "Bonus in arrivo") return "bg-[#D97706] text-white";
  if (status === "Registrato da completare") return "bg-[#7C3AED] text-white";
  return "bg-[#DC2626] text-white";
}

function statusSelectStyle(status: string) {
  if (status === "Bonus arrivato") return "bg-[#16A34A] text-white";
  if (status === "Bonus in arrivo") return "bg-[#D97706] text-white";
  if (status === "Registrato da completare") return "bg-[#7C3AED] text-white";
  return "bg-[#DC2626] text-white";
}

function statusColor(status: string) {
  if (status === "Bonus arrivato") return "#16A34A";
  if (status === "Bonus in arrivo") return "#D97706";
  if (status === "Registrato da completare") return "#7C3AED";
  return "#DC2626";
}

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  COINBASE: "#0052FF",
  REVOLUT: "#1A1A2E",
  ING: "#FF6200",
  ISYBANK: "#FF6B35",
  BBVA: "#004481",
  BUDDYBANK: "#FF4B7B",
  BINANCE: "#D4A017",
  KRAKEN: "#5741D9",
};

function platformBadgeColor(name: string) {
  return PLATFORM_BADGE_COLORS[name] ?? "#2D7DD2";
}

export default function HomePage() {
  const [rows, setRows] = useState<BonusRecord[]>([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BonusFormState>(defaultForm);
  const [loadingRead, setLoadingRead] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [infoDrafts, setInfoDrafts] = useState<Record<number, string>>({});
  const [infoSavedRow, setInfoSavedRow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const bonusValue = Number(form.bonus || 0);
  const speseValue = Number(form.spese || 0);
  const amazonValue = Number(form.amazon || 0);
  const nettoForm = bonusValue - speseValue - amazonValue;

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
        body: JSON.stringify({
          ...form,
          bonus: Number(form.bonus || 0),
          spese: Number(form.spese || 0),
          amazon: Number(form.amazon || 0),
        }),
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
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="-mx-5 -mt-5 bg-transparent px-5 pb-8 pt-10 text-center">
          <Image
            src="/logo.png"
            alt="PayOff logo"
            width={200}
            height={80}
            priority
            className="mx-auto mb-4 w-[200px] [filter:brightness(0)_invert(1)]"
          />
          <h1 className="text-[28px] font-extrabold leading-tight text-white">Ciao! 👋</h1>
          <p className="text-base text-white/70">Gestisci i tuoi bonus</p>
        </header>

        <section className="rounded-[24px] border border-white/30 bg-white/15 p-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <h2 className="text-xl font-bold">Registra Nuovo Bonus</h2>
          <p className="mt-1 text-sm text-white/80">Aggiungi una nuova riga al foglio.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 min-h-12 w-full rounded-2xl bg-white px-5 py-4 text-xl font-extrabold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
          >
            ＋ Registra Nuovo Bonus
          </button>
        </section>

        <section className="rounded-[24px] border border-white/30 bg-white/15 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <h2 className="mb-3 text-xl font-bold">Cerca persona</h2>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
              🔍
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca persona..."
              className="min-h-14 w-full rounded-xl border border-white/30 bg-white/20 py-4 pl-12 pr-4 text-lg font-medium text-white outline-none placeholder:text-white/60 focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
              <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
                Caricamento righe in corso...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
                Nessun risultato
              </div>
            ) : (
              filteredRows.map((row) => (
                <article
                  key={row.rowNumber}
                  className="rounded-[20px] border border-white/20 bg-white/12 p-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]"
                  style={{ borderLeft: `5px solid ${statusColor(row.stato)}` }}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <h3 className="text-[24px] leading-tight font-bold text-white">
                      {row.personaInvitata || "(senza nome)"}
                    </h3>
                    <p className="text-[32px] leading-none font-bold text-white">
                      {row.netto.toFixed(2)}
                    </p>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span
                      className="ml-auto rounded-full px-3 py-1.5 text-[14px] font-bold text-white"
                      style={{ backgroundColor: platformBadgeColor(row.piattaforma) }}
                    >
                      {row.piattaforma || "PIATTAFORMA"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-base md:grid-cols-2">
                    <div>
                      <p className="text-[12px] font-bold text-white/70">Data</p>
                      <p className="text-[16px] font-black text-white">{row.data || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white/70">Netto $</p>
                      <p className="text-[16px] font-black text-white">
                        {row.netto.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[12px] font-bold text-white/70">STATO</span>
                    <select
                      value={row.stato}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "stato", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-stato`}
                      className={`min-h-12 w-full rounded-xl border border-black/20 px-4 py-2.5 text-[15px] font-bold outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20 ${statusSelectStyle(row.stato)}`}
                    >
                      <option
                        value="Bonus arrivato"
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#16A34A",
                          fontWeight: 700,
                        }}
                      >
                        Bonus arrivato
                      </option>
                      <option
                        value="Bonus in arrivo"
                        style={{
                          backgroundColor: "#fef9c3",
                          color: "#D97706",
                          fontWeight: 700,
                        }}
                      >
                        Bonus in arrivo
                      </option>
                      <option
                        value="Registrato da completare"
                        style={{
                          backgroundColor: "#ede9fe",
                          color: "#7C3AED",
                          fontWeight: 700,
                        }}
                      >
                        Registrato da completare
                      </option>
                      <option
                        value="FAIL"
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#DC2626",
                          fontWeight: 700,
                        }}
                      >
                        FAIL
                      </option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[12px] font-bold text-white/70">Ricevente</span>
                    <select
                      value={row.ricevente}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "ricevente", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-ricevente`}
                      className="min-h-12 w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-base font-bold text-black outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20"
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
                    <span className="text-[12px] font-bold text-white/70">AFFILIATI</span>
                    <select
                      value={row.affiliati}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "affiliati", event.target.value)
                      }
                      disabled={updatingKey === `${row.rowNumber}-affiliati`}
                      className="min-h-12 w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-base font-bold text-black outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20"
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
                      <span className="text-[12px] font-bold text-white/70">INFO</span>
                      {infoSavedRow === row.rowNumber ? (
                          <span className="text-sm font-semibold text-emerald-300">
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
                      className="w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-[16px] font-black text-black outline-none placeholder:text-black/50 focus:border-black/40 focus:ring-2 focus:ring-black/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[12px] font-bold text-white/70">Bonus $</span>
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
                      className="min-h-12 w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-[16px] font-black text-black outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[12px] font-bold text-white/70">Spese</span>
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
                      className="min-h-12 w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-[16px] font-black text-black outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[12px] font-bold text-white/70">Amazon</span>
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
                      className="min-h-12 w-full rounded-xl border border-black/20 bg-white/30 px-3 py-2 text-[16px] font-black text-black outline-none focus:border-black/40 focus:ring-2 focus:ring-black/20"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm">
          <div className="h-screen w-full overflow-y-auto bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 sm:mx-auto sm:mt-4 sm:h-auto sm:max-h-[95vh] sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Registra nuovo bonus</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Piattaforma *</span>
                <select
                  value={form.piattaforma}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, piattaforma: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                >
                  {PLATFORMS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Persona invitata</span>
                <input
                  value={form.personaInvitata}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, personaInvitata: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none placeholder:text-white/60 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">STATO *</span>
                <select
                  value={form.stato}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stato: event.target.value }))
                  }
                  className={`min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25 ${statusBadge(form.stato)}`}
                >
                  {STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Ricevente</span>
                <select
                  value={form.ricevente}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ricevente: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
                <span className="text-base text-white/80 sm:text-lg">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, data: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">AFFILIATI</span>
                <select
                  value={form.affiliati}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliati: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
                <span className="text-base text-white/80 sm:text-lg">INFO</span>
                <textarea
                  value={form.info}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, info: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none placeholder:text-white/60 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                  rows={3}
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Bonus $</span>
                <input
                  type="number"
                  value={form.bonus}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bonus: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Spese</span>
                <input
                  type="number"
                  value={form.spese}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, spese: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Amazon</span>
                <input
                  type="number"
                  value={form.amazon}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amazon: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Netto $ (auto)</span>
                <input
                  readOnly
                  value={nettoForm.toFixed(2)}
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-base font-bold text-emerald-200"
                />
              </label>
            </div>

            <div className="sticky bottom-0 mt-6 flex flex-col gap-3 bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] pb-6 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-12 rounded-2xl border border-white/70 bg-transparent px-5 py-3 text-lg font-semibold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveBonus()}
                className="min-h-14 w-full rounded-2xl bg-white px-5 py-3 text-[18px] font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 sm:w-auto"
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
