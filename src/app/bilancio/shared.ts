export const receiverGradients: Record<string, string> = {
  Lori: "linear-gradient(135deg, #667eea, #764ba2)",
  Diego: "linear-gradient(135deg, #f093fb, #f5576c)",
  Cusi: "linear-gradient(135deg, #4facfe, #00f2fe)",
  Ludovica: "linear-gradient(135deg, #43e97b, #38f9d7)",
  Rubi: "linear-gradient(135deg, #fa709a, #fee140)",
  "MATTIA RUSSO": "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "Luca pietra": "linear-gradient(135deg, #fda085, #f6d365)",
  "Alessia longo": "linear-gradient(135deg, #5eead4, #3b82f6)",
};

export function receiverGradient(name: string) {
  return receiverGradients[name] ?? "linear-gradient(135deg, #667eea, #764ba2)";
}

export function money(value: number) {
  return `$${value.toFixed(2)}`;
}

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
  MYFIN: "#0D9488",
};

export function statusColor(stato: string) {
  return STATUS_COLORS[stato] ?? "#6B7280";
}

export function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#2D7DD2";
}
