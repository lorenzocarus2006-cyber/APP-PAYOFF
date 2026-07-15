export const PLATFORMS = [
  "BUDDYBANK",
  "COINBASE",
  "BBVA",
  "KRAKEN",
  "REVOLUT",
  "BINANCE",
  "ISYBANK",
  "ING",
  "MYFIN",
] as const;

export const STATUSES = [
  "Bonus arrivato",
  "Bonus in arrivo",
  "Registrato da completare",
  "FAIL",
] as const;

export const RECEIVERS = [
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
  "Extra6",
  "Extra7",
] as const;

export const AFFILIATES = [
  "AGATA",
  "DAVIDE",
  "SAMUEL",
  "LELE",
  "ZINNA",
  "LUCA LADRO",
  "DANIELE LO FARO",
  "PITTA",
  "PEPI",
  "TONY",
] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Status = (typeof STATUSES)[number];
export type Receiver = (typeof RECEIVERS)[number];
export type Affiliate = (typeof AFFILIATES)[number];
