"use client";

import { useEffect, useState } from "react";
import type { BilancioOverview, BilancioReceiverStats } from "@/lib/types";

type BilancioResponse = {
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
  error?: string;
};

const receiverColors: Record<string, string> = {
  Lori: "#60A5FA",
  Diego: "#34D399",
  Cusi: "#F472B6",
  Ludovica: "#F59E0B",
  Rubi: "#A78BFA",
  "MATTIA RUSSO": "#22D3EE",
  "Luca pietra": "#F87171",
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function AmountCell({
  value,
  className,
}: {
  value: number;
  className: string;
}) {
  if (value === 0) return <span className="text-[#D1D5DB]">{money(0)}</span>;
  return <span className={`font-bold ${className}`}>{money(value)}</span>;
}

export const dynamic = "force-dynamic";

export default function BilancioPage() {
  const [overview, setOverview] = useState<BilancioOverview | null>(null);
  const [riceventi, setRiceventi] = useState<BilancioReceiverStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/bilancio/stats", { cache: "no-store" });
        const data = (await res.json()) as BilancioResponse;
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento del bilancio.");
        setOverview(data.overview);
        setRiceventi(data.riceventi ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  const metrics = overview
    ? [
        { label: "💰 Netto Totale", value: money(overview.nettoTotale) },
        { label: "⏳ In Arrivo", value: money(overview.inArrivoTotale) },
        { label: "📋 Da Completare", value: money(overview.daCompletareTotale) },
        { label: "❌ FAIL", value: String(overview.failCount) },
        { label: "🤝 Totale % Affiliati", value: money(overview.totalePercentoAffiliati) },
        { label: "💎 Netto - % Affiliati", value: money(overview.nettoMenoPercentoAffiliati) },
        { label: "🧾 Spese", value: money(overview.speseTotali) },
        { label: "✅ Completati", value: String(overview.completatiCount) },
        { label: "⏳ In Arrivo count", value: String(overview.inArrivoCount) },
        { label: "📋 Da Completare count", value: String(overview.daCompletareCount) },
      ]
    : [];

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <h1 className="text-3xl font-bold tracking-tight">Bilancio 🏦</h1>
          <p className="mt-2 text-base text-white/70">Overview e dettaglio per ricevente</p>
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

        <section className="space-y-4 pb-4">
          <h2 className="text-xl font-semibold">Schede per Ricevente</h2>
          {riceventi.map((receiver) => (
            <article
              key={receiver.ricevente}
              className="rounded-2xl border border-white/25 bg-white/12 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]"
            >
              <h3
                className="mb-3 text-lg font-extrabold"
                style={{ color: receiverColors[receiver.ricevente] ?? "#ffffff" }}
              >
                {receiver.ricevente}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-white/80">
                      <th className="px-2 py-2 font-semibold">App</th>
                      <th className="px-2 py-2 text-center font-semibold">✅ Arrivato $</th>
                      <th className="px-2 py-2 text-center font-semibold">⏳ Arrivo $</th>
                      <th className="px-2 py-2 text-center font-semibold">📋 Da fare $</th>
                      <th className="px-2 py-2 text-center font-semibold">❌ Fail $</th>
                      <th className="px-2 py-2 text-center font-semibold">🎁 Amzn $</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 bg-white/10">
                      <td className="px-2 py-2 font-bold">TOTALE</td>
                      <td className="px-2 py-2 text-center">
                        <AmountCell value={receiver.total.arrivato} className="text-[#16A34A]" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <AmountCell value={receiver.total.arrivo} className="text-[#D97706]" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <AmountCell value={receiver.total.daFare} className="text-[#7C3AED]" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <AmountCell value={receiver.total.fail} className="text-[#DC2626]" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <AmountCell value={receiver.total.amazon} className="text-[#EA580C]" />
                      </td>
                    </tr>
                    {receiver.platforms.map((platform) => (
                      <tr key={platform.app} className="border-b border-white/10">
                        <td className="px-2 py-2 font-semibold">{platform.app}</td>
                        <td className="px-2 py-2 text-center">
                          <AmountCell value={platform.arrivato} className="text-[#16A34A]" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <AmountCell value={platform.arrivo} className="text-[#D97706]" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <AmountCell value={platform.daFare} className="text-[#7C3AED]" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <AmountCell value={platform.fail} className="text-[#DC2626]" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <AmountCell value={platform.amazon} className="text-[#EA580C]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
