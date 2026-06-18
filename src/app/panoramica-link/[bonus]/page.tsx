import Link from "next/link";
import { notFound } from "next/navigation";
import { getReceiverLinks } from "@/lib/db";
import { BONUSES, getBonus } from "../bonus-config";
import BonusReceivers from "./BonusReceivers";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return BONUSES.map((bonus) => ({ bonus: bonus.key }));
}

export default async function BonusDetailPage({
  params,
}: {
  params: Promise<{ bonus: string }>;
}) {
  const { bonus: bonusKey } = await params;
  const bonus = getBonus(bonusKey);
  if (!bonus) notFound();

  const piattaforma = bonus.key.toUpperCase();
  const receivers = await getReceiverLinks(piattaforma);

  const totale = receivers.reduce((sum, r) => sum + r.count, 0);
  const attivi = receivers.filter((r) => r.count > 0).length;
  const daRitirare = receivers.filter((r) => r.count > 0 && !r.ritirato).length;

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <Link
          href="/panoramica-link"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Tutti i bonus
        </Link>

        <header
          className="overflow-hidden rounded-3xl border border-white/25 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.16)] backdrop-blur-[20px]"
          style={{
            background: `linear-gradient(135deg, ${bonus.color}40, rgba(255,255,255,0.08))`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
              style={{
                backgroundColor: bonus.color,
                boxShadow: `0 6px 18px -6px ${bonus.color}`,
              }}
            >
              {bonus.short}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Riceventi
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{bonus.label}</h1>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
              <p className="text-3xl font-bold tabular-nums leading-none">{totale}</p>
              <p className="mt-1 text-xs text-white/60">link totali</p>
            </div>
            <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
              <p className="text-3xl font-bold tabular-nums leading-none">{attivi}</p>
              <p className="mt-1 text-xs text-white/60">riceventi attivi</p>
            </div>
            <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
              <p className="text-3xl font-bold tabular-nums leading-none text-red-300">
                {daRitirare}
              </p>
              <p className="mt-1 text-xs text-white/60">da ritirare</p>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-4 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> da ritirare
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> ritirati
            </span>
          </p>
        </header>

        <BonusReceivers piattaforma={piattaforma} color={bonus.color} initial={receivers} />
      </main>
    </div>
  );
}
