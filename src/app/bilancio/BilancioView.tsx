"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type {
  BilancioDetail,
  BilancioLiquiditaSummary,
  BilancioOverview,
  BilancioReceiverStats,
} from "@/lib/types";
import BonusListModal from "./BonusListModal";
import SummaryListModal from "./SummaryListModal";
import { money, receiverGradient } from "./shared";

type BilancioViewProps = {
  overview: BilancioOverview | null;
  riceventi: BilancioReceiverStats[];
  detail: BilancioDetail | null;
  liquidita?: BilancioLiquiditaSummary | null;
  loading: boolean;
  error: string;
  title: string;
  subtitle: string;
  headerAction?: ReactNode;
  scope?: "current" | "storico";
};

type ModalKind =
  | "inArrivo"
  | "daCompletare"
  | "amazonInArrivo"
  | "amazonDaCompletare"
  | "affiliati"
  | "spese"
  | null;

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="page-eyebrow px-1">{children}</p>;
}

function MetricCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`surface-card flex flex-col gap-1.5 p-4 text-left transition-transform ${
        onClick ? "active:scale-[0.97]" : ""
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/45">
        {label}
      </span>
      <span
        className="font-mono text-xl font-extrabold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </span>
    </Tag>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  onClick,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative rounded-2xl border border-white/25 bg-white/12 p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition-transform ${
        onClick ? "active:scale-[0.97]" : ""
      }`}
    >
      <span
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-base ${iconClass}`}
      >
        {icon}
      </span>
      <p className="pr-10 text-[11px] font-bold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-3 font-mono text-2xl font-extrabold tabular-nums text-white">{value}</p>
    </Tag>
  );
}

function CounterPill({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/8 p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-[16px]">
      <span className="text-base">{icon}</span>
      <p className="text-xl font-extrabold tabular-nums text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

export default function BilancioView({
  overview,
  riceventi,
  detail,
  liquidita,
  loading,
  error,
  title,
  subtitle,
  headerAction,
  scope = "current",
}: BilancioViewProps) {
  const [modal, setModal] = useState<ModalKind>(null);

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-6">
        <header className="flex items-start justify-between gap-3 surface-card p-5">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="mt-2 text-base text-white/70">{subtitle}</p>
          </div>
          {headerAction}
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-300">{error}</div>
        ) : null}

        {loading || !overview ? (
          <div className="surface-card p-6 text-white/70">
            Caricamento metriche...
          </div>
        ) : (
          <>
            {/* 1. CASSA — Liquidità è il saldo reale, hero della pagina come il totale di un portafoglio. */}
            {liquidita ? (
              <Link
                href="/liquidita"
                className="block rounded-3xl border border-emerald-400/20 bg-[linear-gradient(160deg,#0b1f18_0%,#0f2a20_60%,#0b1220_100%)] p-7 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/70">
                    💵 Liquidità
                  </p>
                  <span className="text-sm text-white/40">›</span>
                </div>
                {liquidita.configured ? (
                  <>
                    <p className="mt-3 text-5xl font-black tracking-tight text-white">
                      {money(liquidita.valore)}
                    </p>
                    <div className="mx-auto mt-4 flex max-w-sm flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/50">
                      <span>Iniziale {money(liquidita.valoreIniziale)}</span>
                      <span>− Spese dal {liquidita.dataAttivazione} {money(liquidita.speseDedotte)}</span>
                      <span>+ Prelievi {money(liquidita.prelieviTotali)}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-white/60">
                    Non ancora configurata — tocca per impostare il valore iniziale.
                  </p>
                )}
              </Link>
            ) : null}

            {/* 2. FLUSSO — netto, in arrivo (lordo) e da completare, come asset class sotto il totale. */}
            <section className="space-y-2.5">
              <SectionLabel>Flusso</SectionLabel>
              <div className="grid grid-cols-3 gap-2.5">
                <MetricCard
                  label="Netto totale"
                  value={money(overview.nettoTotale)}
                  accent="#e2e8f0"
                />
                <MetricCard
                  label="In arrivo"
                  value={money(overview.inArrivoTotale)}
                  accent="#fbbf24"
                  onClick={() => setModal("inArrivo")}
                />
                <MetricCard
                  label="Da completare"
                  value={money(overview.daCompletareTotale)}
                  accent="#c4b5fd"
                  onClick={() => setModal("daCompletare")}
                />
              </div>
            </section>

            {/* 3. DETTAGLI — breakdown, come la lista asset di un'app bancaria. */}
            <section className="space-y-2.5">
              <SectionLabel>Dettagli</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon="🤝"
                  iconClass="bg-sky-400/20 text-sky-300"
                  label="Totale % Affiliati"
                  value={money(overview.totalePercentoAffiliati)}
                  onClick={() => setModal("affiliati")}
                />
                <StatCard
                  icon="🧾"
                  iconClass="bg-rose-400/20 text-rose-300"
                  label="Spese"
                  value={money(overview.speseTotali)}
                  onClick={() => setModal("spese")}
                />
                <StatCard
                  icon="🎁"
                  iconClass="bg-amber-400/20 text-amber-300"
                  label="Amazon in arrivo"
                  value={money(overview.amazonInArrivo)}
                  onClick={() => setModal("amazonInArrivo")}
                />
                <StatCard
                  icon="🎁"
                  iconClass="bg-violet-400/20 text-violet-300"
                  label="Amazon da completare"
                  value={money(overview.amazonDaCompletare)}
                  onClick={() => setModal("amazonDaCompletare")}
                />
              </div>

              {/* Amazon: buoni non spendibili come cassa, tenuti separati dalla liquidità. */}
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3">
                <span className="text-xs font-semibold text-white/50">
                  🎁 Buoni Amazon arrivati <span className="text-white/30">(non cassa)</span>
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-white/70">
                  {money(overview.amazonArrivato)}
                </span>
              </div>
            </section>

            {/* 4. STATO — conteggi bonus per stato. */}
            <section className="space-y-2.5">
              <SectionLabel>Stato bonus</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                <CounterPill icon="❌" label="Fail" value={overview.failCount} />
                <CounterPill icon="✅" label="Completati" value={overview.completatiCount} />
                <CounterPill icon="⏳" label="In arrivo" value={overview.inArrivoCount} />
                <CounterPill icon="📋" label="Da completare" value={overview.daCompletareCount} />
              </div>
            </section>
          </>
        )}

        {/* 5. RICEVENTI — dettaglio per persona. */}
        <section className="space-y-2.5 pb-4">
          <SectionLabel>Schede per ricevente</SectionLabel>
          <div className="space-y-3">
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
          </div>
        </section>
      </main>

      {modal === "inArrivo" && detail ? (
        <BonusListModal
          title="Soldi in arrivo"
          subtitle="Bonus con stato «Bonus in arrivo»"
          rows={detail.bonusInArrivo}
          amountField="bonus"
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "daCompletare" && detail ? (
        <BonusListModal
          title="Registrato da completare"
          subtitle="Bonus con stato «Registrato da completare»"
          rows={detail.bonusDaCompletare}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "amazonInArrivo" && detail ? (
        <BonusListModal
          title="Amazon in arrivo"
          subtitle="Bonus Amazon con stato «Bonus in arrivo»"
          rows={detail.amazonInArrivo}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "amazonDaCompletare" && detail ? (
        <BonusListModal
          title="Amazon da completare"
          subtitle="Bonus Amazon con stato «Registrato da completare»"
          rows={detail.amazonDaCompletare}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "affiliati" && detail ? (
        <SummaryListModal
          title="Totale % Affiliati"
          subtitle="Generato per affiliato (solo bonus arrivati)"
          items={detail.affiliati.map((a) => ({ label: a.nome, value: a.totale }))}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "spese" && detail ? (
        <SummaryListModal
          title="Spese"
          subtitle="Spese per piattaforma (bonus in arrivo o arrivati)"
          items={detail.spese.map((s) => ({ label: s.piattaforma, value: s.totale }))}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
