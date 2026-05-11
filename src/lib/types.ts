export type BonusRecord = {
  rowNumber: number;
  piattaforma: string;
  personaInvitata: string;
  stato: string;
  ricevente: string;
  data: string;
  info: string;
  affiliati: string;
  bonus: number;
  spese: number;
  amazon: number;
  netto: number;
};

export type NewBonusPayload = {
  piattaforma: string;
  personaInvitata: string;
  stato: string;
  ricevente: string;
  data: string;
  info: string;
  affiliati: string;
  bonus: number;
  spese: number;
  amazon: number;
};

export type LinkOverviewRow = {
  intestatario: string;
  coinbase: number;
  bbva: number;
  binance: number;
  buddybank: number;
  isybank: number;
  revolut: number;
  ing: number;
};

export type AffiliateSummary = {
  nome: string;
  generato: number;
  pagato: number;
  daPagare: number;
  pagamentiCount: number;
};

export type AffiliatePayment = {
  affiliato: string;
  importo: number;
  data: string;
  modalita: string;
  note: string;
};

export type BilancioOverview = {
  nettoTotale: number;
  inArrivoTotale: number;
  daCompletareTotale: number;
  failCount: number;
  totalePercentoAffiliati: number;
  nettoMenoPercentoAffiliati: number;
  speseTotali: number;
  completatiCount: number;
  inArrivoCount: number;
  daCompletareCount: number;
};

export type BilancioReceiverPlatformStats = {
  app: string;
  arrivato: number;
  arrivo: number;
  daFare: number;
  fail: number;
  totale: number;
};

export type BilancioReceiverStats = {
  ricevente: string;
  total: BilancioReceiverPlatformStats;
  platforms: BilancioReceiverPlatformStats[];
};
