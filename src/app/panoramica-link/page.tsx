import { readLinkOverviewRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const columns = [
  { key: "coinbase", label: "COINBASE" },
  { key: "bbva", label: "BBVA" },
  { key: "binance", label: "BINANCE" },
  { key: "buddybank", label: "BUDDYBANK" },
  { key: "isybank", label: "ISYBANK" },
  { key: "revolut", label: "REVOLUT" },
  { key: "ing", label: "ING" },
] as const;

const badgeColors: Record<(typeof columns)[number]["key"], string> = {
  coinbase: "bg-[#0052FF] text-white",
  bbva: "bg-[#004481] text-white",
  binance: "bg-[#F0B90B] text-black",
  buddybank: "bg-[#FF4B7B] text-white",
  isybank: "bg-[#FF6B35] text-white",
  revolut: "bg-[#1A1A2E] text-white",
  ing: "bg-[#FF6200] text-white",
};

export default async function PanoramicaLinkPage() {
  const rows = await readLinkOverviewRows();
  const totals = columns.reduce<Record<string, number>>((acc, column) => {
    acc[column.key] = rows.reduce((sum, row) => sum + row[column.key], 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-[#F8FAFF] px-5 py-5 text-[#1A1A2E]">
      <main className="mx-auto w-full space-y-5">
        <header className="rounded-2xl bg-[#2D7DD2] p-5 text-white shadow-[0_8px_20px_rgba(45,125,210,0.35)]">
          <h1 className="text-3xl font-bold tracking-tight">Panoramica Link</h1>
          <p className="mt-2 text-base text-white/80">Conteggio Link per Intestatario</p>
        </header>

        {rows.map((row) => {
          const activeBadges = columns.filter((column) => row[column.key] > 0);
          return (
            <article
              key={row.intestatario}
              className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            >
              <h2 className="text-xl font-bold">{row.intestatario}</h2>
              {activeBadges.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeBadges.map((column) => (
                    <span
                      key={column.key}
                      className={`rounded-full px-3 py-1 text-sm font-bold ${badgeColors[column.key]}`}
                    >
                      {column.label}: {row[column.key]}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                  Nessun link
                </div>
              )}
            </article>
          );
        })}

        <section className="rounded-2xl bg-[#DCEBFF] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-extrabold text-[#2D7DD2]">TOTALE</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {columns.map((column) => (
              <span
                key={column.key}
                className={`rounded-full px-3 py-1 text-sm font-bold ${badgeColors[column.key]}`}
              >
                {column.label}: {totals[column.key] ?? 0}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
