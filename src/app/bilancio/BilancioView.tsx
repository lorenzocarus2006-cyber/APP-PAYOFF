"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { BilancioOverview, BilancioReceiverStats } from "@/lib/types";
import { money, receiverGradient } from "./shared";

type BilancioViewProps = {
  overview: BilancioOverview | null;
  riceventi: BilancioReceiverStats[];
  loading: boolean;
  error: string;
  title: string;
  subtitle: string;
  headerAction?: ReactNode;
  scope?: "current" | "storico";
};

export default function BilancioView({
  overview,
  riceventi,
  loading,
  error,
  title,
  subtitle,
  headerAction,
  scope = "current",
}: BilancioViewProps) {
  const metrics = overview
    ? [
        { label: "💰 Netto Totale", value: money(overview.nettoTotale) },
        { label: "⏳ In Arrivo", value: money(overview.inArrivoTotale) },
        { label: "📋 Da Completare", value: money(overview.daCompletareTotale) },
        { label: "🎁 Totale Amazon", value: money(overview.amazonTotale) },
        { label: "🎁 Amazon Arrivato", value: money(overview.amazonArrivato) },
        { label: "🎁 Amazon in Arrivo", value: money(overview.amazonInArrivo) },
        { label: "🎁 Amazon da Completare", value: money(overview.amazonDaCompletare) },
        { label: "❌ FAIL", value: String(overview.failCount) },
        { label: "🤝 Totale % Affiliati", value: money(overview.totalePercentoAffiliati) },
        { label: "🧾 Spese", value: money(overview.speseTotali) },
        { label: "✅ Completati", value: String(overview.completatiCount) },
        { label: "⏳ In Arrivo count", value: String(overview.inArrivoCount) },
        { label: "📋 Da Completare count", value: String(overview.daCompletareCount) },
      ]
    : [];

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="flex items-start justify-between gap-3 rounded-2xl border border-white/25 bg-white/10 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-base text-white/70">{subtitle}</p>
          </div>
          {headerAction}
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Overview Totale</h2>
          {loading ? (
            <div className="rounded-2xl border border-white/25 bg-white/10 p-6 text-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
              Caricamento metriche...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-2xl border border-white/25 bg-white/12 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]"
                >
                  <p className="text-xs text-white/70">{metric.label}</p>
                  <p className="mt-2 text-2xl font-extrabold">{metric.value}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 pb-4">
          <h2 className="text-xl font-semibold">Schede per Ricevente</h2>
          {riceventi.map((receiver) => (
            <Link
              key={receiver.ricevente}
              href={`/bilancio/ricevente/${encodeURIComponent(receiver.ricevente)}${
                scope === "storico" ? "?scope=storico" : ""
              }`}
              className="flex items-center justify-between rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-transform active:scale-[0.98]"
              style={{ background: receiverGradient(receiver.ricevente) }}
            >
              <div>
                <h3 className="text-xl font-extrabold text-white">{receiver.ricevente}</h3>
                <p className="mt-1 text-sm text-white/80">
                  ✅ {money(receiver.total.arrivato)} · ⏳ {money(receiver.total.arrivo)}
                </p>
              </div>
              <span className="text-2xl text-white/80">›</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
