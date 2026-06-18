import type { LinkOverviewRow } from "@/lib/types";

export type BonusKey = keyof Omit<LinkOverviewRow, "intestatario">;

export type BonusConfig = {
  key: BonusKey;
  /** Nome mostrato. */
  label: string;
  /** Etichetta breve per badge/iniziali. */
  short: string;
  /** Colore brand. */
  color: string;
};

/** Singola fonte di verità per i bonus della Panoramica Link. */
export const BONUSES: BonusConfig[] = [
  { key: "coinbase", label: "Coinbase", short: "CB", color: "#0052FF" },
  { key: "bbva", label: "BBVA", short: "BV", color: "#1464A5" },
  { key: "binance", label: "Binance", short: "BN", color: "#F0B90B" },
  { key: "buddybank", label: "Buddybank", short: "BB", color: "#FF2D78" },
  { key: "isybank", label: "Isybank", short: "IB", color: "#FF6B35" },
  { key: "revolut", label: "Revolut", short: "RV", color: "#6B7280" },
  { key: "ing", label: "ING", short: "IN", color: "#FF6200" },
];

export function getBonus(key: string): BonusConfig | undefined {
  return BONUSES.find((bonus) => bonus.key === key);
}

/** Ordine righe (riceventi) condiviso tra le pagine. */
export const PANORAMICA_ROW_ORDER = [
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

export function panoramicaRowOrder(name: string) {
  const idx = (PANORAMICA_ROW_ORDER as readonly string[]).indexOf(name);
  return idx === -1 ? 999 : idx;
}
