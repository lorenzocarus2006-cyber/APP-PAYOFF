"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { BilancioDetail, BilancioOverview, BilancioReceiverStats } from "@/lib/types";
import BonusListModal from "./BonusListModal";
import SummaryListModal from "./SummaryListModal";
import { money, receiverGradient } from "./shared";

type BilancioViewProps = {
  overview: BilancioOverview | null;
  riceventi: BilancioReceiverStats[];
  detail: BilancioDetail | null;
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

function HighlightCard({
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
      className={`flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform ${
        onClick ? "active:scale-[0.97]" : ""
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${iconClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white/70">{label}</p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-white">{value}</p>
      </div>
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
      className={`relative rounded-2xl border border-white/25 bg-white/12 p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform ${
        onClick ? "active:scale-[0.97]" : ""
      }`}
    >
      <span
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-base ${iconClass}`}
      >
        {icon}
      </span>
      <p className="pr-10 text-[11px] font-bold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-3 font-mono text-2xl font-extrabold text-white">{value}</p>
    </Tag>
  );
}

function CounterCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/8 p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-[16px]">
      <span className="text-base">{icon}</span>
      <p className="text-xl font-extrabold text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

export default function BilancioView({
  overview,
  riceventi,
  detail,
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

        {loading || !overview ? (
          <div className="rounded-2xl border border-white/25 bg-white/10 p-6 text-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Caricamento metriche...
          </div>
        ) : (
          <>
            {/* HERO */}
            <section className="rounded-3xl border border-white/10 bg-[linear-gradient(160deg,#111827_0%,#1f2937_55%,#0b1220_100%)] p-7 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Netto Totale</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-white">
                {money(overview.nettoTotale)}
              </p>
            </section>

            {/* HIGHLIGHTS */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <HighlightCard
                icon="⏳"
                iconClass="bg-amber-400/20 text-amber-300"
                label="Soldi in arrivo"
                value={money(overview.inArrivoTotale)}
                onClick={() => setModal("inArrivo")}
              />
              <HighlightCard
                icon="📋"
                iconClass="bg-violet-400/20 text-violet-300"
                label="Registrato da completare"
                value={money(overview.daCompletareTotale)}
                onClick={() => setModal("daCompletare")}
              />
              <HighlightCard
                icon="🎁"
                iconClass="bg-emerald-400/20 text-emerald-300"
                label="Buoni Amazon"
                value={money(overview.amazonArrivato)}
              />
            </section>

            {/* MAIN STATS GRID */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Panoramica</h2>
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
            </section>

            {/* SMALL COUNTERS */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white/70">Conteggi</h2>
              <div className="grid grid-cols-4 gap-2">
                <CounterCard icon="❌" label="Fail" value={overview.failCount} />
                <CounterCard icon="✅" label="Completati" value={overview.completatiCount} />
                <CounterCard icon="⏳" label="In arrivo" value={overview.inArrivoCount} />
                <CounterCard icon="📋" label="Da completare" value={overview.daCompletareCount} />
              </div>
            </section>
          </>
        )}

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

      {modal === "inArrivo" && detail ? (
        <BonusListModal
          title="Soldi in arrivo"
          subtitle="Bonus con stato «Bonus in arrivo»"
          rows={detail.bonusInArrivo}
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
