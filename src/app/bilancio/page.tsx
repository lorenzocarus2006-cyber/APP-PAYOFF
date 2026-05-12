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

const receiverGradients: Record<string, string> = {
  Lori: "linear-gradient(135deg, #667eea, #764ba2)",
  Diego: "linear-gradient(135deg, #f093fb, #f5576c)",
  Cusi: "linear-gradient(135deg, #4facfe, #00f2fe)",
  Ludovica: "linear-gradient(135deg, #43e97b, #38f9d7)",
  Rubi: "linear-gradient(135deg, #fa709a, #fee140)",
  "MATTIA RUSSO": "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "Luca pietra": "linear-gradient(135deg, #fda085, #f6d365)",
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
  if (value === 0) return <span className="text-white/30">{money(0)}</span>;
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
              className="rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
              style={{
                background:
                  receiverGradients[receiver.ricevente] ??
                  "linear-gradient(135deg, #667eea, #764ba2)",
              }}
            >
              <h3
                className="mb-4 text-[28px] font-extrabold text-white"
                style={{ color: receiverColors[receiver.ricevente] ? "#ffffff" : "#ffffff" }}
              >
                {receiver.ricevente}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/20 text-[13px] uppercase tracking-wide text-white/80">
                      <th className="px-3 pb-2 pt-3 font-bold">App</th>
                      <th className="px-3 pb-2 pt-3 text-center font-bold">✅ Arrivato $</th>
                      <th className="px-3 pb-2 pt-3 text-center font-bold">⏳ Arrivo $</th>
                      <th className="px-3 pb-2 pt-3 text-center font-bold">📋 Da fare $</th>
                      <th className="px-3 pb-2 pt-3 text-center font-bold">❌ Fail $</th>
                      <th className="px-3 pb-2 pt-3 text-center font-bold">🎁 Amzn $</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 bg-black/20">
                      <td className="px-3 py-3 text-[16px] font-extrabold text-white">TOTALE</td>
                      <td className="px-3 py-3 text-center text-[15px]">
                        <AmountCell value={receiver.total.arrivato} className="text-[#86efac]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px]">
                        <AmountCell value={receiver.total.arrivo} className="text-[#fde68a]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px]">
                        <AmountCell value={receiver.total.daFare} className="text-[#c4b5fd]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px]">
                        <AmountCell value={receiver.total.fail} className="text-[#fca5a5]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px]">
                        <AmountCell value={receiver.total.amazon} className="text-[#fed7aa]" />
                      </td>
                    </tr>
                    {receiver.platforms.map((platform, index) => (
                      <tr
                        key={platform.app}
                        className={`border-b border-white/10 ${index % 2 === 0 ? "bg-white/5" : "bg-transparent"}`}
                      >
                        <td className="px-3 py-3 text-[14px] font-bold text-white">{platform.app}</td>
                        <td className="px-3 py-3 text-center text-[15px] font-bold">
                          <AmountCell value={platform.arrivato} className="text-[#86efac]" />
                        </td>
                        <td className="px-3 py-3 text-center text-[15px] font-bold">
                          <AmountCell value={platform.arrivo} className="text-[#fde68a]" />
                        </td>
                        <td className="px-3 py-3 text-center text-[15px] font-bold">
                          <AmountCell value={platform.daFare} className="text-[#c4b5fd]" />
                        </td>
                        <td className="px-3 py-3 text-center text-[15px] font-bold">
                          <AmountCell value={platform.fail} className="text-[#fca5a5]" />
                        </td>
                        <td className="px-3 py-3 text-center text-[15px] font-bold">
                          <AmountCell value={platform.amazon} className="text-[#fed7aa]" />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-black/15">
                      <td className="px-3 py-3 text-[14px] font-bold text-white">{receiver.amazonRow.app}</td>
                      <td className="px-3 py-3 text-center text-[15px] font-bold">
                        <AmountCell value={receiver.amazonRow.arrivato} className="text-[#86efac]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px] font-bold">
                        <AmountCell value={receiver.amazonRow.arrivo} className="text-[#fde68a]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px] font-bold">
                        <AmountCell value={receiver.amazonRow.daFare} className="text-[#c4b5fd]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px] font-bold">
                        <AmountCell value={receiver.amazonRow.fail} className="text-[#fca5a5]" />
                      </td>
                      <td className="px-3 py-3 text-center text-[15px] font-bold">
                        <AmountCell value={receiver.amazonRow.amazon} className="text-[#fed7aa]" />
                      </td>
                    </tr>
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
