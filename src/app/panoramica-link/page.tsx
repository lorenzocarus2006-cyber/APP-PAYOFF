import { readLinkOverviewRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/** Ordine righe tabella (dopo "Luca pietra" → "Alessia longo", poi Extra). */
const PANORAMICA_ROW_ORDER = [
  "Lori",
  "Diego",
  "poma",
  "Cusi",
  "Ludovica",
  "Rubi",
  "MATTIA RUSSO",
  "Luca pietra",
  "Alessia longo",
  "Extra3",
  "Extra4",
  "Extra5",
] as const;

function panoramicaRowOrder(name: string) {
  const idx = (PANORAMICA_ROW_ORDER as readonly string[]).indexOf(name);
  return idx === -1 ? 999 : idx;
}

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
  const rawRows = await readLinkOverviewRows();
  const rows = [...rawRows].sort(
    (a, b) => panoramicaRowOrder(a.intestatario) - panoramicaRowOrder(b.intestatario),
  );
  const totals = columns.reduce<Record<string, number>>((acc, column) => {
    acc[column.key] = rows.reduce((sum, row) => sum + row[column.key], 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="rounded-2xl border border-white/25 bg-white/10 p-5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <h1 className="text-3xl font-bold tracking-tight">Panoramica Link</h1>
          <p className="mt-2 text-base text-white/80">Conteggio Link per Intestatario</p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/20 text-sm uppercase tracking-wide text-white">
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
                    className={index % 2 === 0 ? "bg-white/5" : "bg-white/10"}
                  >
                    <td className="px-3 py-3 text-base font-semibold text-white">
                      {row.intestatario}
                    </td>
                    {columns.map((column) => {
                      const value = row[column.key];
                      const hasValue = value > 0;
                      return (
                        <td key={column.key} className="px-3 py-3 text-center text-lg">
                          {hasValue ? (
                            <span
                              className="inline-block rounded-full px-2 py-0.5 font-bold text-white"
                              style={{ backgroundColor: numberColors[column.key] }}
                            >
                              {value}
                            </span>
                          ) : (
                            <span className="text-white/30">0</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-white/20 text-white">
                  <td className="px-3 py-3 text-base font-bold">TOTALE</td>
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 text-center text-lg font-bold">
                      {(totals[column.key] ?? 0) > 0 ? (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-bold text-white"
                          style={{ backgroundColor: numberColors[column.key] }}
                        >
                          {totals[column.key] ?? 0}
                        </span>
                      ) : (
                        <span className="text-white/30">0</span>
                      )}
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
