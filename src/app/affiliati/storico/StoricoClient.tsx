"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AffiliatePayment, AffiliateSummary } from "@/lib/types";

type AffiliatesResponse = {
  summaries: AffiliateSummary[];
  payments: AffiliatePayment[];
  error?: string;
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

export default function StoricoClient() {
  const [summaries, setSummaries] = useState<AffiliateSummary[]>([]);
  const [payments, setPayments] = useState<AffiliatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegistro, setShowRegistro] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/affiliati/read?scope=storico", { cache: "no-store" });
        const data = (await res.json()) as AffiliatesResponse;
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento dello storico.");
        setSummaries(data.summaries ?? []);
        setPayments(data.payments ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Storico 📜</h1>
            <p className="mt-2 text-base text-white/70">Affiliati precedenti al 14/07/2026 (solo og)</p>
          </div>
          <Link
            href="/affiliati"
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
          >
            ← Affiliati
          </Link>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRegistro((prev) => !prev)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition-colors hover:bg-white/15"
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
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              {payments.length === 0 ? (
                <p className="p-5 text-sm text-white/60">Nessun pagamento nello storico.</p>
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

        <section className="space-y-3 pb-4">
          <h2 className="text-base font-semibold uppercase tracking-wide text-white/60">Affiliati</h2>
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
              Caricamento dati storici...
            </div>
          ) : (
            <ul className="space-y-3">
              {summaries.map((summary) => {
                const hasDebt = summary.daPagare > 0.009;
                const color = AFFILIATE_HEADER_COLORS[summary.nome] ?? "#2D7DD2";
                return (
                  <li
                    key={summary.nome}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: color, color: affiliateHeaderTextColor(summary.nome) }}
                    >
                      {summary.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold leading-tight">{summary.nome}</p>
                      <p className="mt-1 text-xs text-white/60">
                        Generato {money(summary.generato)} · Pagato {money(summary.pagato)} ·{" "}
                        <span className={hasDebt ? "text-red-300" : "text-emerald-300"}>
                          Da pagare {money(summary.daPagare)}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
