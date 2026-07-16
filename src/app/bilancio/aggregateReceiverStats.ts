import type { BilancioReceiverStats } from "@/lib/types";

export type ReceiverBonusRow = {
  id: number;
  piattaforma: string;
  stato: string;
  netto: number;
  amazon: number;
  data: string;
  url: string | null;
};

const STATUS_TO_KEY: Record<string, "arrivato" | "arrivo" | "daFare" | "fail"> = {
  "Bonus arrivato": "arrivato",
  "Bonus in arrivo": "arrivo",
  "Registrato da completare": "daFare",
  FAIL: "fail",
};

export function aggregateReceiverStats(
  ricevente: string,
  rows: ReceiverBonusRow[],
): BilancioReceiverStats {
  const platformOrder: string[] = [];
  const platformMap: Record<
    string,
    { arrivato: number; arrivo: number; daFare: number; fail: number; amazon: number }
  > = {};
  const amazonRow = { arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 };

  for (const row of rows) {
    const app = row.piattaforma;
    if (!platformMap[app]) {
      platformMap[app] = { arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 };
      platformOrder.push(app);
    }
    const key = STATUS_TO_KEY[row.stato];
    if (!key) continue;
    platformMap[app][key] += row.netto;
    platformMap[app].amazon += row.amazon;
    amazonRow[key] += row.amazon;
    amazonRow.amazon += row.amazon;
  }

  const platforms = platformOrder.map((app) => ({ app, ...platformMap[app] }));
  const total = platforms.reduce(
    (acc, item) => ({
      app: "TOTALE",
      arrivato: acc.arrivato + item.arrivato,
      arrivo: acc.arrivo + item.arrivo,
      daFare: acc.daFare + item.daFare,
      fail: acc.fail + item.fail,
      amazon: acc.amazon + item.amazon,
    }),
    { app: "TOTALE", arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 },
  );

  return {
    ricevente,
    total,
    amazonRow: { app: "🎁 Amazon", ...amazonRow },
    platforms,
  };
}
