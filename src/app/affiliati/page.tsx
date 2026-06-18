"use client";

import { useEffect, useMemo, useState } from "react";
import { AFFILIATES } from "@/config/dropdowns";
import type { AffiliatePayment, AffiliateSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

type AffiliatesResponse = {
  summaries: AffiliateSummary[];
  payments: AffiliatePayment[];
};

type PaymentForm = {
  affiliato: string;
  importo: number;
  data: string;
  modalita: string;
  note: string;
};

const defaultForm: PaymentForm = {
  affiliato: AFFILIATES[0],
  importo: 0,
  data: "",
  modalita: "",
  note: "",
};

function money(value: number) {
  return value.toFixed(2);
}

const AFFILIATE_HEADER_COLORS: Record<string, string> = {
  AGATA: "#FF6B6B",
  DAVIDE: "#4ECDC4",
  SAMUEL: "#45B7D1",
  LELE: "#96CEB4",
  ZINNA: "#FFEAA7",
  "LUCA LADRO": "#DDA0DD",
  "DANIELE LO FARO": "#98D8C8",
  PITTA: "#F7DC6F",
  PEPI: "#BB8FCE",
  TONY: "#85C1E9",
  EXTRA6: "#F0B27A",
  EXTRA7: "#82E0AA",
};

function affiliateHeaderTextColor(name: string) {
  return name === "ZINNA" || name === "PITTA" ? "#1A1A2E" : "#ffffff";
}

export default function AffiliatiPage() {
  const [summaries, setSummaries] = useState<AffiliateSummary[]>([]);
  const [payments, setPayments] = useState<AffiliatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentForm>(defaultForm);
  const [showRegistro, setShowRegistro] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchAffiliates() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/affiliati/read", {
        cache: "no-store",
      });
      const data = (await res.json()) as AffiliatesResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore caricamento affiliati.");
      setSummaries(data.summaries ?? []);
      setPayments(data.payments ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchAffiliates();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  async function handleSavePayment() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/affiliati/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliato: form.affiliato,
          importo: form.importo,
          data: form.data,
          modalita: form.modalita,
          note: form.note,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio pagamento.");

      setSuccess("Pagamento registrato con successo.");
      setShowModal(false);
      setForm(defaultForm);
      await fetchAffiliates();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const visibleSummaries = useMemo(
    () => summaries,
    [summaries],
  );

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Affiliati</h1>
          <p className="mt-2 text-base text-white/70">Registro affiliati e pagamenti</p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            {success}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-transform active:scale-[0.98]"
        >
          ＋ Registra Nuovo Pagamento
        </button>

        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRegistro((prev) => !prev)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-colors hover:bg-white/15"
          >
            <span className="flex items-center gap-2">
              📋 Registro Pagamenti
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold tabular-nums text-white/80">
                {payments.length}
              </span>
            </span>
            <svg
              className={`h-5 w-5 text-white/50 transition-transform duration-300 ${showRegistro ? "rotate-180" : ""}`}
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

          {showRegistro ? (
            <div className="animate-[fadeSlide_0.3s_ease_both] overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
              {payments.length === 0 ? (
                <p className="p-5 text-sm text-white/60">Nessun pagamento registrato.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {payments.map((payment, index) => (
                    <li
                      key={`${payment.affiliato}-${payment.data}-${index}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: AFFILIATE_HEADER_COLORS[payment.affiliato] ?? "#2D7DD2",
                          color: affiliateHeaderTextColor(payment.affiliato),
                        }}
                      >
                        {payment.affiliato.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{payment.affiliato}</p>
                        <p className="truncate text-xs text-white/55">
                          {payment.data || "—"}
                          {payment.modalita ? ` · ${payment.modalita}` : ""}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-bold tabular-nums text-white">
                        {money(payment.importo)} €
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold uppercase tracking-wide text-white/60">
            Affiliati
          </h2>
          {loading ? (
            <div className="rounded-2xl border border-white/25 bg-white/10 p-6 text-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
              Caricamento dati affiliati...
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleSummaries.map((summary, index) => {
                const hasDebt = summary.daPagare > 0.009;
                const isOpen = expanded === summary.nome;
                const color = AFFILIATE_HEADER_COLORS[summary.nome] ?? "#2D7DD2";
                return (
                  <li
                    key={summary.nome}
                    className="animate-[fadeSlide_0.4s_ease_both]"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : summary.nome)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform active:scale-[0.99] hover:bg-white/15"
                    >
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold"
                        style={{
                          backgroundColor: color,
                          color: affiliateHeaderTextColor(summary.nome),
                        }}
                      >
                        {summary.nome.slice(0, 2).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold leading-tight">
                          {summary.nome}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${hasDebt ? "bg-red-400" : "bg-emerald-400"}`}
                            style={{
                              boxShadow: hasDebt
                                ? "0 0 8px 1px rgba(248,113,113,0.8)"
                                : "0 0 8px 1px rgba(52,211,153,0.7)",
                            }}
                          />
                          <span className={hasDebt ? "text-red-200" : "text-emerald-200"}>
                            {hasDebt ? `Debito ${money(summary.daPagare)} €` : "Nessun debito"}
                          </span>
                        </span>
                      </div>

                      <svg
                        className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
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

                    {isOpen ? (
                      <dl className="animate-[fadeSlide_0.25s_ease_both] mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                          <dt className="text-[11px] text-white/60">💰 Generato</dt>
                          <dd className="mt-0.5 text-lg font-bold tabular-nums">{money(summary.generato)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                          <dt className="text-[11px] text-white/60">✅ Pagato</dt>
                          <dd className="mt-0.5 text-lg font-bold tabular-nums">{money(summary.pagato)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                          <dt className="text-[11px] text-white/60">⏳ Da pagare</dt>
                          <dd
                            className={`mt-0.5 text-lg font-bold tabular-nums ${hasDebt ? "text-red-300" : "text-emerald-300"}`}
                          >
                            {money(summary.daPagare)}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/8 p-3">
                          <dt className="text-[11px] text-white/60">🔢 Pagamenti</dt>
                          <dd className="mt-0.5 text-lg font-bold tabular-nums">{summary.pagamentiCount}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm">
          <div className="h-screen w-full overflow-y-auto bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 sm:mx-auto sm:mt-4 sm:h-auto sm:max-h-[95vh] sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Registra Nuovo Pagamento</h2>
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Affiliato</span>
                <select
                  value={form.affiliato}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliato: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                >
                  {AFFILIATES.map((affiliate) => (
                    <option key={affiliate} value={affiliate}>
                      {affiliate}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Importo</span>
                <input
                  type="number"
                  value={form.importo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, importo: Number(event.target.value || 0) }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Modalita</span>
                <select
                  value={form.modalita}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, modalita: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                >
                  <option value="">-</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base text-white/80 sm:text-lg">Note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-base text-white outline-none placeholder:text-white/60 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
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
                onClick={() => void handleSavePayment()}
                className="min-h-12 rounded-2xl bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60"
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
