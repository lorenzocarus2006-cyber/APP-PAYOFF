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

export default function AffiliatiPage() {
  const [summaries, setSummaries] = useState<AffiliateSummary[]>([]);
  const [payments, setPayments] = useState<AffiliatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentForm>(defaultForm);

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
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 md:px-8 md:py-10">
      <main className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6 md:space-y-7">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Affiliati</h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">Registro affiliati e pagamenti</p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            {success}
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold sm:text-2xl">Card Affiliati</h2>
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
              Caricamento dati affiliati...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {visibleSummaries.map((summary) => (
                <article
                  key={summary.nome}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="mb-2 text-base font-bold text-[#0066ff] sm:text-lg">
                    {summary.nome}
                  </h3>
                  <dl className="space-y-1 text-sm sm:text-base">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Generato</dt>
                      <dd className="font-semibold">{money(summary.generato)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Pagato</dt>
                      <dd className="font-semibold">{money(summary.pagato)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Da pagare</dt>
                      <dd className="font-semibold">{money(summary.daPagare)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500"># Pagamenti</dt>
                      <dd className="font-semibold">{summary.pagamentiCount}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold sm:text-2xl">Registro Pagamenti</h2>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="min-h-12 w-full rounded-xl bg-[#0066ff] px-5 py-3 text-lg font-bold text-white sm:w-auto"
            >
              ＋ Registra Nuovo Pagamento
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[680px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Affiliato</th>
                  <th className="px-3 py-3 font-semibold">Importo</th>
                  <th className="px-3 py-3 font-semibold">Data</th>
                  <th className="px-3 py-3 font-semibold">Modalita</th>
                  <th className="px-3 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={`${payment.affiliato}-${payment.data}-${index}`} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold">{payment.affiliato}</td>
                    <td className="px-3 py-3 font-semibold text-[#0066ff]">
                      {money(payment.importo)}
                    </td>
                    <td className="px-3 py-3">{payment.data || "-"}</td>
                    <td className="px-3 py-3">{payment.modalita || "-"}</td>
                    <td className="px-3 py-3">{payment.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/30 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="h-screen w-full overflow-y-auto bg-white p-5 sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6">
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Registra Nuovo Pagamento</h2>
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-1">
                <span className="text-base sm:text-lg">Affiliato</span>
                <select
                  value={form.affiliato}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliato: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                >
                  {AFFILIATES.map((affiliate) => (
                    <option key={affiliate} value={affiliate}>
                      {affiliate}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Importo</span>
                <input
                  type="number"
                  value={form.importo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, importo: Number(event.target.value || 0) }))
                  }
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                />
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Modalita</span>
                <select
                  value={form.modalita}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, modalita: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
                >
                  <option value="">-</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-base sm:text-lg">Note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-lg"
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
                onClick={() => void handleSavePayment()}
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
