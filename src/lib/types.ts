export type BonusRecord = {
  id: number;
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
  ritirato: boolean;
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

export type PlatformStat = {
  key: string;
  total: number;
  attivi: number;
};

export type ReceiverLinkDetail = {
  ricevente: string;
  count: number;
  maxed: boolean;
  linkOCodice: string;
  soldiSulConto: number;
  soldiRitirati: number;
  soldiDaPrelevare: number;
};

export type SavedLink = {
  id: number;
  piattaforma: string;
  intestatario: string;
  url: string;
  createdAt: string;
};

export type Lead = {
  id: number;
  nome: string;
  telefono: string;
  descrizione: string;
  bonusInteresse: string[];
  createdAt: string;
};

export type AffiliateSummary = {
  nome: string;
  percentuale: number;
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
  amazonTotale: number;
  amazonArrivato: number;
  amazonInArrivo: number;
  amazonDaCompletare: number;
  failCount: number;
  totalePercentoAffiliati: number;
  nettoMenoPercentoAffiliati: number;
  speseTotali: number;
  completatiCount: number;
  inArrivoCount: number;
  daCompletareCount: number;
};

export type BilancioAffiliateBreakdown = {
  nome: string;
  totale: number;
};

export type BilancioPlatformExpense = {
  piattaforma: string;
  totale: number;
};

export type BilancioDetail = {
  bonusInArrivo: BonusRecord[];
  bonusDaCompletare: BonusRecord[];
  amazonInArrivo: BonusRecord[];
  amazonDaCompletare: BonusRecord[];
  affiliati: BilancioAffiliateBreakdown[];
  spese: BilancioPlatformExpense[];
};

export type BilancioReceiverPlatformStats = {
  app: string;
  arrivato: number;
  arrivo: number;
  daFare: number;
  fail: number;
  amazon: number;
};

export type BilancioReceiverStats = {
  ricevente: string;
  total: BilancioReceiverPlatformStats;
  amazonRow: BilancioReceiverPlatformStats;
  platforms: BilancioReceiverPlatformStats[];
};
