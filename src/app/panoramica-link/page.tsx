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

function NumberCell({ value }: { value: number }) {
  if (value > 0) {
    return <span className="font-bold text-[#0066ff]">{value}</span>;
  }
  return <span className="text-slate-400">0</span>;
}

export default async function PanoramicaLinkPage() {
  const rows = await readLinkOverviewRows();
  const totals = columns.reduce<Record<string, number>>((acc, column) => {
    acc[column.key] = rows.reduce((sum, row) => sum + row[column.key], 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-[#F8FAFF] px-5 py-5 text-[#1A1A2E]">
      <main className="mx-auto w-full space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Panoramica Link</h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">
            Conteggio Link per Intestatario
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Intestatario</th>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 py-3 text-center font-semibold">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.intestatario} className="border-b border-slate-100">
                    <td className="px-3 py-3 text-base font-semibold text-slate-800">
                      {row.intestatario}
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-3 text-center text-lg">
                        <NumberCell value={row[column.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-3 py-3 text-base font-bold text-slate-900">TOTALE</td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-3 py-3 text-center text-lg font-bold text-slate-900"
                    >
                      <NumberCell value={totals[column.key] ?? 0} />
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
