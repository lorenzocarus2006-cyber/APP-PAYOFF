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

const numberColors: Record<(typeof columns)[number]["key"], string> = {
  coinbase: "#0052FF",
  bbva: "#004481",
  binance: "#D4A017",
  buddybank: "#FF4B7B",
  isybank: "#FF6B35",
  revolut: "#374151",
  ing: "#FF6200",
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

        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#2D7DD2] text-sm uppercase tracking-wide text-white">
                  <th className="px-3 py-3 font-bold">Intestatario</th>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 py-3 text-center font-bold">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.intestatario}
                    className={index % 2 === 0 ? "bg-white" : "bg-[#F8FAFF]"}
                  >
                    <td className="px-3 py-3 text-base font-semibold text-[#1A1A2E]">
                      {row.intestatario}
                    </td>
                    {columns.map((column) => {
                      const value = row[column.key];
                      const hasValue = value > 0;
                      return (
                        <td key={column.key} className="px-3 py-3 text-center text-lg">
                          <span
                            className={hasValue ? "font-bold" : ""}
                            style={{
                              color: hasValue ? numberColors[column.key] : "#D1D5DB",
                            }}
                          >
                            {value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-[#2D7DD2] text-white">
                  <td className="px-3 py-3 text-base font-bold">TOTALE</td>
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 text-center text-lg font-bold">
                      {totals[column.key] ?? 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
