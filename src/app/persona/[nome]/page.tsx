import Link from "next/link";
import { notFound } from "next/navigation";
import { readBonusRows } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  "Bonus arrivato": "#16A34A",
  "Bonus in arrivo": "#D97706",
  "Registrato da completare": "#7C3AED",
  FAIL: "#DC2626",
};

const PLATFORM_COLORS: Record<string, string> = {
  COINBASE: "#0052FF",
  REVOLUT: "#374151",
  ING: "#FF6200",
  ISYBANK: "#FF6B35",
  BBVA: "#004481",
  BUDDYBANK: "#FF4B7B",
  BINANCE: "#D4A017",
  KRAKEN: "#5741D9",
};

function statusColor(stato: string) {
  return STATUS_COLORS[stato] ?? "#6B7280";
}

function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#2D7DD2";
}

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome: rawNome } = await params;
  const nome = decodeURIComponent(rawNome);
  const target = nome.trim().toLowerCase();

  const allRows = await readBonusRows();
  const rows = allRows.filter(
    (row) => (row.personaInvitata.trim() || "(senza nome)").toLowerCase() === target,
  );
  if (rows.length === 0) notFound();

  const totalNetto = rows.reduce((sum, row) => sum + row.netto, 0);
  const totalBonus = rows.reduce((sum, row) => sum + row.bonus, 0);

  const statusBreakdown = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.stato || "—";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <Link
          href="/"
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
          Cerca
        </Link>

        <header className="overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.14)] backdrop-blur-[20px]">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold uppercase">
              {nome.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Profilo
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight">{nome}</h1>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
              <p className="text-3xl font-bold tabular-nums leading-none">
                {totalNetto.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-white/60">netto $ totale</p>
            </div>
            <div className="flex-1 rounded-2xl bg-black/15 px-4 py-3">
              <p className="text-3xl font-bold tabular-nums leading-none">{rows.length}</p>
              <p className="mt-1 text-xs text-white/60">bonus · {totalBonus.toFixed(0)}$ lordo</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(statusBreakdown).map(([stato, count]) => (
              <span
                key={stato}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusColor(stato) }}
                />
                {stato} · {count}
              </span>
            ))}
          </div>
        </header>

        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="animate-[fadeSlide_0.4s_ease_both] overflow-hidden rounded-2xl bg-white/10 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]"
              style={{
                animationDelay: `${index * 50}ms`,
                borderLeft: `5px solid ${platformColor(row.piattaforma)}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="rounded-full px-3 py-1 text-sm font-bold text-white"
                  style={{ backgroundColor: platformColor(row.piattaforma) }}
                >
                  {row.piattaforma || "—"}
                </span>
                <span className="text-2xl font-bold leading-none tabular-nums">
                  {row.netto.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusColor(row.stato) }}
                />
                <span className="text-sm font-medium text-white/85">{row.stato || "—"}</span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-[11px] text-white/50">Data</dt>
                  <dd className="font-semibold">{row.data || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/50">Ricevente</dt>
                  <dd className="font-semibold">{row.ricevente || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/50">Affiliati</dt>
                  <dd className="font-semibold">{row.affiliati || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-white/50">Bonus / Spese / Amazon</dt>
                  <dd className="font-semibold tabular-nums">
                    {row.bonus} / {row.spese} / {row.amazon}
                  </dd>
                </div>
              </dl>

              {row.info.trim() ? (
                <p className="mt-3 rounded-xl bg-black/15 px-3 py-2 text-sm text-white/80">
                  {row.info}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
