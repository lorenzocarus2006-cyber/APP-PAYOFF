export type PlatformConfig = {
  key: string;
  label: string;
  short: string;
  color: string;
  bonusDefault: number;
  speseDefault: number;
  amazonDefault: number;
};

/** Piattaforme storiche dell'app: singola fonte di verità per label/colore/iniziali/importi. */
export const STATIC_PLATFORMS: PlatformConfig[] = [
  { key: "COINBASE", label: "Coinbase", short: "CB", color: "#0052FF", bonusDefault: 20, speseDefault: 3, amazonDefault: 0 },
  { key: "BBVA", label: "BBVA", short: "BV", color: "#004481", bonusDefault: 20, speseDefault: 1, amazonDefault: 0 },
  { key: "BINANCE", label: "Binance", short: "BN", color: "#D4A017", bonusDefault: 0, speseDefault: 0, amazonDefault: 0 },
  { key: "BUDDYBANK", label: "Buddybank", short: "BB", color: "#FF4B7B", bonusDefault: 50, speseDefault: 11, amazonDefault: 0 },
  { key: "ISYBANK", label: "Isybank", short: "IB", color: "#FF6B35", bonusDefault: 30, speseDefault: 0, amazonDefault: 30 },
  { key: "REVOLUT", label: "Revolut", short: "RV", color: "#374151", bonusDefault: 0, speseDefault: 0, amazonDefault: 0 },
  { key: "ING", label: "ING", short: "IN", color: "#FF6200", bonusDefault: 50, speseDefault: 1, amazonDefault: 0 },
  { key: "MYFIN", label: "MyFin", short: "MF", color: "#0D9488", bonusDefault: 0, speseDefault: 0, amazonDefault: 0 },
  { key: "KRAKEN", label: "Kraken", short: "KR", color: "#5741D9", bonusDefault: 0, speseDefault: 0, amazonDefault: 0 },
];

/** Palette per generare colori distinti per nuove piattaforme personalizzate. */
export const PLATFORM_COLOR_PALETTE = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F43F5E",
  "#84CC16",
  "#0EA5E9",
];

export function nextPlatformColor(existingCustomCount: number) {
  return PLATFORM_COLOR_PALETTE[existingCustomCount % PLATFORM_COLOR_PALETTE.length];
}

export function initialsFor(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.trim().slice(0, 2).toUpperCase() || "??";
}

export function platformKeyFor(label: string) {
  return label.trim().toUpperCase();
}

/** Unisce le piattaforme statiche con quelle personalizzate salvate su Supabase (dedup per key). */
export function mergePlatforms(custom: PlatformConfig[]): PlatformConfig[] {
  const seen = new Set(STATIC_PLATFORMS.map((p) => p.key));
  const extra = custom.filter((p) => !seen.has(p.key));
  return [...STATIC_PLATFORMS, ...extra];
}

export function getPlatform(key: string, list: PlatformConfig[] = STATIC_PLATFORMS) {
  return list.find((p) => p.key === key.toUpperCase());
}

export function buildPlatformColorMap(list: PlatformConfig[]): Record<string, string> {
  return list.reduce<Record<string, string>>((acc, p) => {
    acc[p.key] = p.color;
    return acc;
  }, {});
}

export function buildPlatformShortMap(list: PlatformConfig[]): Record<string, string> {
  return list.reduce<Record<string, string>>((acc, p) => {
    acc[p.key] = p.short;
    return acc;
  }, {});
}
