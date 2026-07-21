import Link from "next/link";
import { getLiquiditaOverview } from "@/lib/db";
import { money } from "../bilancio/shared";
import LiquiditaSetupForm from "./LiquiditaSetupForm";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  prelievo: "Prelievo",
  spesa: "Spesa",
  iniziale: "Iniziale",
  rettifica: "Rettifica",
};

export default async function LiquiditaPage() {
  const overview = await getLiquiditaOverview();

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5 pb-6">
        <header className="flex items-start justify-between gap-3 surface-card p-5">
          <div>
            <p className="page-eyebrow">Cassa reale</p>
            <h1 className="page-title mt-1">Liquidità</h1>
          </div>
          <Link
            href="/bilancio"
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
          >
            ← Bilancio
          </Link>
        </header>

        <section className="rounded-3xl border border-emerald-400/20 bg-[linear-gradient(160deg,#0b1f18_0%,#0f2a20_60%,#0b1220_100%)] p-7 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/70">
            Saldo attuale
          </p>
          <p className="mt-3 text-5xl font-black tracking-tight text-white">
            {overview.config ? money(overview.valore) : "—"}
          </p>
          {overview.config ? (
            <div className="mx-auto mt-4 max-w-xs space-y-1 text-sm text-white/60">
              <p>Iniziale: {money(overview.valoreIniziale)}</p>
              <p>
                − Spese dal {overview.config.dataAttivazione}: {money(overview.speseDedotte)}
              </p>
              <p>+ Prelievi totali: {money(overview.prelieviTotali)}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/60">
              Imposta un valore iniziale e una data di attivazione per iniziare a tracciare la liquidità.
            </p>
          )}
          <p className="mt-4 text-xs text-white/35">
            🎁 Buoni Amazon totali (esclusi dalla liquidità): {money(overview.amazonTotale)}
          </p>
        </section>

        <LiquiditaSetupForm config={overview.config} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Movimenti</h2>
          {overview.ledger.length === 0 ? (
            <div className="empty-state">Nessun movimento registrato ancora.</div>
          ) : (
            <ul className="space-y-2">
              {overview.ledger.map((row) => {
                const positive = row.importo >= 0;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 surface-card p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {row.descrizione || TIPO_LABEL[row.tipo] || row.tipo}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {row.data} · {TIPO_LABEL[row.tipo] ?? row.tipo}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-base font-extrabold tabular-nums ${
                        positive ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {money(Math.abs(row.importo))}
                    </span>
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
