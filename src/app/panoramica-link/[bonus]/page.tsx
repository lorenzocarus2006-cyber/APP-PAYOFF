import Link from "next/link";
import { notFound } from "next/navigation";
import { readLinkOverviewRows } from "@/lib/db";
import { BONUSES, getBonus, panoramicaRowOrder } from "../bonus-config";

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

  const rawRows = await readLinkOverviewRows();
  const rows = [...rawRows]
    .map((row) => ({ intestatario: row.intestatario, count: row[bonus.key] }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return panoramicaRowOrder(a.intestatario) - panoramicaRowOrder(b.intestatario);
    });

  const totale = rows.reduce((sum, row) => sum + row.count, 0);
  const max = rows.reduce((m, row) => Math.max(m, row.count), 0);
  const attivi = rows.filter((row) => row.count > 0).length;

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
          </div>
        </header>

        <ul className="space-y-2.5">
          {rows.map((row, index) => {
            const active = row.count > 0;
            const pct = max > 0 ? (row.count / max) * 100 : 0;
            return (
              <li
                key={row.intestatario}
                className="animate-[fadeSlide_0.4s_ease_both]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div
                  className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 backdrop-blur-[20px] ${
                    active ? "border-white/20 bg-white/10" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute inset-y-0 left-0 -z-0 rounded-2xl opacity-25"
                      style={{ width: `${pct}%`, backgroundColor: bonus.color }}
                    />
                  )}

                  <span className="relative z-10 w-6 text-sm font-bold tabular-nums text-white/40">
                    {index + 1}
                  </span>
                  <span
                    className={`relative z-10 min-w-0 flex-1 truncate text-base font-semibold ${
                      active ? "text-white" : "text-white/45"
                    }`}
                  >
                    {row.intestatario}
                  </span>
                  <span
                    className="relative z-10 grid min-w-9 place-items-center rounded-full px-3 py-1 text-base font-bold tabular-nums text-white"
                    style={{ backgroundColor: active ? bonus.color : "rgba(255,255,255,0.12)" }}
                  >
                    {row.count}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
