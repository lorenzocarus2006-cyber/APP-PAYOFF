import { STATIC_PLATFORMS } from "./platforms";

/** Elenco piattaforme statiche (fallback prima del fetch delle piattaforme personalizzate). */
export const PLATFORMS = STATIC_PLATFORMS.map((p) => p.key) as unknown as readonly string[];

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

export const AFFILIATES = ["Salvo Coco"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Status = (typeof STATUSES)[number];
export type Receiver = (typeof RECEIVERS)[number];
export type Affiliate = (typeof AFFILIATES)[number];
