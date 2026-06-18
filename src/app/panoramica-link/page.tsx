import Link from "next/link";
import { readLinkOverviewRows } from "@/lib/db";
import { BONUSES } from "./bonus-config";

export const dynamic = "force-dynamic";

export default async function PanoramicaLinkPage() {
  const rows = await readLinkOverviewRows();

  const stats = BONUSES.map((bonus) => {
    const total = rows.reduce((sum, row) => sum + row[bonus.key], 0);
    const attivi = rows.filter((row) => row[bonus.key] > 0).length;
    return { ...bonus, total, attivi };
  });

  const totaleLink = stats.reduce((sum, bonus) => sum + bonus.total, 0);

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.14)] backdrop-blur-[20px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Panoramica
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Link per Bonus</h1>
          <p className="mt-2 text-sm text-white/70">
            Scegli un bonus per vedere il conteggio di tutti i riceventi.
          </p>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums leading-none">{totaleLink}</span>
            <span className="pb-1 text-sm text-white/60">link totali</span>
          </div>
        </header>

        <ul className="space-y-3">
          {stats.map((bonus, index) => (
            <li
              key={bonus.key}
              className="animate-[fadeSlide_0.4s_ease_both]"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <Link
                href={`/panoramica-link/${bonus.key}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform duration-200 active:scale-[0.98] hover:border-white/40 hover:bg-white/15"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-inner"
                  style={{
                    backgroundColor: bonus.color,
                    boxShadow: `0 6px 18px -6px ${bonus.color}`,
                  }}
                >
                  {bonus.short}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-tight">{bonus.label}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {bonus.attivi} {bonus.attivi === 1 ? "ricevente" : "riceventi"} attivi
                  </p>
                </div>

                <span
                  className="grid min-w-10 place-items-center rounded-full px-3 py-1 text-base font-bold tabular-nums text-white"
                  style={{ backgroundColor: bonus.color }}
                >
                  {bonus.total}
                </span>

                <svg
                  className="h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
