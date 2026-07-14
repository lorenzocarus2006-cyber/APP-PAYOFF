import { isOnOrAfterCutoff } from "./date";
import type { Role } from "./role";
import { getSupabase } from "./supabase";
import type {
  AffiliatePayment,
  AffiliateSummary,
  BilancioOverview,
  BilancioReceiverPlatformStats,
  BilancioReceiverStats,
  BonusRecord,
  LinkOverviewRow,
  NewBonusPayload,
} from "./types";

/**
 * "all" = nessun filtro (vista storica per og su Home/Persona, invariata).
 * "current" = solo bonus/pagamenti da oggi (14/07/2026) in poi (vista di default di Bilancio/Affiliati, per tutti).
 * "storico" = solo dati precedenti al 14/07/2026 (pulsante Storico, riservato a og).
 */
export type DataScope = "all" | "current" | "storico";

function matchesScope(dateValue: string, scope: DataScope): boolean {
  if (scope === "all") return true;
  const isNew = isOnOrAfterCutoff(dateValue);
  return scope === "current" ? isNew : !isNew;
}

/** Roster di fallback se la tabella affiliates è vuota/non raggiungibile. */
const AFFILIATE_FALLBACK = [
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
];

const DEFAULT_AFFILIATE_RATE = 0.2;

export async function readAffiliateRoster(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("affiliates")
    .select("nome")
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const names = (data as Array<{ nome: string }> | null)?.map((r) => r.nome.trim()) ?? [];
  return names.length ? names : AFFILIATE_FALLBACK;
}

/** Mappa NOME (uppercase) -> percentuale (0-1) di guadagno affiliato. */
export async function readAffiliateRates(): Promise<Record<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("affiliates").select("nome,percentuale");
  if (error) throw new Error(error.message);
  const rows = (data as Array<{ nome: string; percentuale: number | string | null }> | null) ?? [];
  return rows.reduce<Record<string, number>>((acc, row) => {
    const nome = row.nome?.trim().toUpperCase();
    if (!nome) return acc;
    const rate = num(row.percentuale);
    acc[nome] = rate > 0 ? rate : DEFAULT_AFFILIATE_RATE;
    return acc;
  }, {});
}

export async function updateAffiliateRate(nome: string, percentuale: number): Promise<void> {
  const clean = nome.trim();
  if (!clean) throw new Error("Nome affiliato obbligatorio.");
  if (!Number.isFinite(percentuale) || percentuale < 0 || percentuale > 1) {
    throw new Error("Percentuale non valida: deve essere tra 0 e 100.");
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from("affiliates")
    .update({ percentuale })
    .ilike("nome", clean);
  if (error) throw new Error(error.message);
}

export async function insertAffiliate(nome: string): Promise<void> {
  const clean = nome.trim();
  if (!clean) throw new Error("Nome affiliato obbligatorio.");
  const supabase = getSupabase();
  const { error } = await supabase.from("affiliates").insert({ nome: clean });
  if (error) {
    if (error.code === "23505") throw new Error("Affiliato già esistente.");
    throw new Error(error.message);
  }
}

export async function deleteAffiliate(nome: string): Promise<void> {
  const clean = nome.trim();
  if (!clean) throw new Error("Nome affiliato obbligatorio.");
  const supabase = getSupabase();
  const { error } = await supabase.from("affiliates").delete().ilike("nome", clean);
  if (error) throw new Error(error.message);
}

type BonusRow = {
  id: number;
  piattaforma: string;
  persona_invitata: string;
  stato: string;
  ricevente: string;
  data: string;
  info: string;
  affiliati: string;
  bonus: number | string;
  spese: number | string;
  amazon: number | string;
  netto: number | string;
  ritirato: boolean;
};

function num(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapBonus(row: BonusRow): BonusRecord {
  return {
    id: row.id,
    piattaforma: row.piattaforma ?? "",
    personaInvitata: row.persona_invitata ?? "",
    stato: row.stato ?? "",
    ricevente: row.ricevente ?? "",
    data: (row.data ?? "").trim(),
    info: row.info ?? "",
    affiliati: row.affiliati ?? "",
    bonus: num(row.bonus),
    spese: num(row.spese),
    amazon: num(row.amazon),
    netto: num(row.netto),
    ritirato: Boolean(row.ritirato),
  };
}

const BONUS_COLUMNS =
  "id,piattaforma,persona_invitata,stato,ricevente,data,info,affiliati,bonus,spese,amazon,netto,ritirato";

export async function readBonusRows(scope: DataScope = "all"): Promise<BonusRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bonuses")
    .select(BONUS_COLUMNS)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data as BonusRow[] | null)?.map(mapBonus) ?? [];
  return scope === "all" ? rows : rows.filter((row) => matchesScope(row.data, scope));
}

export async function insertBonus(payload: NewBonusPayload): Promise<BonusRecord> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bonuses")
    .insert({
      piattaforma: payload.piattaforma,
      persona_invitata: payload.personaInvitata,
      stato: payload.stato,
      ricevente: payload.ricevente,
      data: payload.data,
      info: payload.info,
      affiliati: payload.affiliati,
      bonus: payload.bonus,
      spese: payload.spese,
      amazon: payload.amazon,
    })
    .select(BONUS_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapBonus(data as BonusRow);
}

const FIELD_TO_COLUMN: Record<string, string> = {
  piattaforma: "piattaforma",
  personaInvitata: "persona_invitata",
  stato: "stato",
  ricevente: "ricevente",
  data: "data",
  info: "info",
  affiliati: "affiliati",
  bonus: "bonus",
  spese: "spese",
  amazon: "amazon",
  ritirato: "ritirato",
};

/** Se role è "salvo", verifica che il bonus target sia >= cutoff prima di procedere (mai per id indovinato). */
async function assertSalvoCanTouch(id: number, role: Role | undefined): Promise<void> {
  if (role !== "salvo") return;
  const supabase = getSupabase();
  const { data, error } = await supabase.from("bonuses").select("data").eq("id", id).single();
  if (error) throw new Error(error.message);
  const dateValue = (data as { data: string } | null)?.data ?? "";
  if (!isOnOrAfterCutoff(dateValue)) {
    throw new Error("Non hai i permessi per modificare questo bonus.");
  }
}

export async function updateBonusField(
  id: number,
  field: string,
  value: string | number | boolean,
  role?: Role,
): Promise<void> {
  const column = FIELD_TO_COLUMN[field];
  if (!column) throw new Error(`Campo non aggiornabile: ${field}`);
  await assertSalvoCanTouch(id, role);
  const supabase = getSupabase();
  const { error } = await supabase.from("bonuses").update({ [column]: value }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBonus(id: number, role?: Role): Promise<void> {
  await assertSalvoCanTouch(id, role);
  const supabase = getSupabase();
  const { error } = await supabase.from("bonuses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function readAffiliatePayments(scope: DataScope = "all"): Promise<AffiliatePayment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("affiliate_payments")
    .select("affiliato,importo,data,modalita,note")
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (
    (data as Array<{
      affiliato: string;
      importo: number | string;
      data: string;
      modalita: string;
      note: string;
    }> | null) ?? []
  )
    .map((row) => ({
      affiliato: (row.affiliato ?? "").trim(),
      importo: num(row.importo),
      data: (row.data ?? "").trim(),
      modalita: (row.modalita ?? "").trim(),
      note: (row.note ?? "").trim(),
    }))
    .filter((row) => row.affiliato);
  return scope === "all" ? rows : rows.filter((row) => matchesScope(row.data, scope));
}

export async function insertAffiliatePayment(payload: {
  affiliato: string;
  importo: number;
  data: string;
  modalita: string;
  note: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("affiliate_payments").insert({
    affiliato: payload.affiliato,
    importo: payload.importo,
    data: payload.data,
    modalita: payload.modalita,
    note: payload.note,
  });
  if (error) throw new Error(error.message);
}

export async function readAffiliatesData(scope: DataScope = "current"): Promise<{
  summaries: AffiliateSummary[];
  payments: AffiliatePayment[];
  roster: string[];
}> {
  const [bonuses, payments, roster, rates] = await Promise.all([
    readBonusRows(scope),
    readAffiliatePayments(scope),
    readAffiliateRoster(),
    readAffiliateRates(),
  ]);

  const generatedByAffiliate = bonuses.reduce<Record<string, number>>((acc, row) => {
    const name = row.affiliati.trim().toUpperCase();
    if (!name) return acc;
    const rate = rates[name] ?? DEFAULT_AFFILIATE_RATE;
    acc[name] = (acc[name] ?? 0) + row.netto * rate;
    return acc;
  }, {});

  const paymentByAffiliate = payments.reduce<Record<string, AffiliatePayment[]>>((acc, p) => {
    const key = p.affiliato.toUpperCase();
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const summaries = roster.map((nome) => {
    const key = nome.toUpperCase();
    const affiliatePayments = paymentByAffiliate[key] ?? [];
    const pagato = affiliatePayments.reduce((sum, p) => sum + p.importo, 0);
    const generato = generatedByAffiliate[key] ?? 0;
    return {
      nome,
      percentuale: rates[key] ?? DEFAULT_AFFILIATE_RATE,
      generato,
      pagato,
      daPagare: generato - pagato,
      pagamentiCount: affiliatePayments.length,
    };
  });

  return { summaries, payments, roster };
}

const LINK_INTESTATARI = [
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
];

const LINK_PLATFORM_KEYS: Record<string, keyof Omit<LinkOverviewRow, "intestatario">> = {
  COINBASE: "coinbase",
  BBVA: "bbva",
  BINANCE: "binance",
  BUDDYBANK: "buddybank",
  ISYBANK: "isybank",
  REVOLUT: "revolut",
  ING: "ing",
};

export async function readLinkOverviewRows(): Promise<LinkOverviewRow[]> {
  const bonuses = await readBonusRows();
  const byReceiver = new Map<string, LinkOverviewRow>();
  for (const intestatario of LINK_INTESTATARI) {
    byReceiver.set(intestatario.toLowerCase(), {
      intestatario,
      coinbase: 0,
      bbva: 0,
      binance: 0,
      buddybank: 0,
      isybank: 0,
      revolut: 0,
      ing: 0,
    });
  }

  for (const row of bonuses) {
    const entry = byReceiver.get(row.ricevente.trim().toLowerCase());
    if (!entry) continue;
    const key = LINK_PLATFORM_KEYS[row.piattaforma.trim().toUpperCase()];
    if (!key) continue;
    entry[key] += 1;
  }

  return LINK_INTESTATARI.map((name) => byReceiver.get(name.toLowerCase())!);
}

export type ReceiverLink = {
  ricevente: string;
  count: number;
  ritirato: boolean;
};

/** Per un bonus (piattaforma), elenco riceventi con n. link e stato "soldi ritirati".
 *  ritirato = il ricevente ha almeno un link e TUTTI i suoi link di quel bonus sono ritirati. */
export async function getReceiverLinks(piattaformaUpper: string): Promise<ReceiverLink[]> {
  const bonuses = await readBonusRows();
  const acc = new Map<string, { count: number; allRitirato: boolean }>();
  for (const name of LINK_INTESTATARI) {
    acc.set(name.toLowerCase(), { count: 0, allRitirato: true });
  }
  for (const row of bonuses) {
    if (row.piattaforma.trim().toUpperCase() !== piattaformaUpper) continue;
    const entry = acc.get(row.ricevente.trim().toLowerCase());
    if (!entry) continue;
    entry.count += 1;
    if (!row.ritirato) entry.allRitirato = false;
  }
  return LINK_INTESTATARI.map((name) => {
    const entry = acc.get(name.toLowerCase())!;
    return {
      ricevente: name,
      count: entry.count,
      ritirato: entry.count > 0 && entry.allRitirato,
    };
  });
}

/** Segna ritirato/non ritirato tutti i link di un ricevente per un dato bonus. */
export async function setReceiverWithdrawn(
  ricevente: string,
  piattaformaUpper: string,
  value: boolean,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("bonuses")
    .update({ ritirato: value })
    .ilike("ricevente", ricevente)
    .ilike("piattaforma", piattaformaUpper);
  if (error) throw new Error(error.message);
}

export async function readBilancioStats(scope: DataScope = "current"): Promise<{
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
}> {
  const [bonuses, affiliateRates] = await Promise.all([
    readBonusRows(scope),
    readAffiliateRates(),
  ]);

  const receiverList = [
    "Lori",
    "Diego",
    "Cusi",
    "Ludovica",
    "Rubi",
    "MATTIA RUSSO",
    "Luca pietra",
    "Alessia longo",
  ];
  const fullPlatformList = ["COINBASE", "BUDDYBANK", "BBVA", "REVOLUT", "ING"];
  const limitedPlatformReceivers = new Set(["Luca pietra", "Alessia longo"]);
  const platformsForReceiver = (r: string) =>
    limitedPlatformReceivers.has(r) ? ["COINBASE", "BBVA"] : fullPlatformList;

  const statusToKey: Record<string, keyof Omit<BilancioReceiverPlatformStats, "app" | "amazon">> = {
    "Bonus arrivato": "arrivato",
    "Bonus in arrivo": "arrivo",
    "Registrato da completare": "daFare",
    FAIL: "fail",
  };

  const receiverMap: Record<string, Record<string, Omit<BilancioReceiverPlatformStats, "app">>> = {};
  const receiverAmazonByStatus: Record<
    string,
    { arrivato: number; arrivo: number; daFare: number; fail: number; amazon: number }
  > = {};
  for (const receiver of receiverList) {
    receiverMap[receiver] = {};
    receiverAmazonByStatus[receiver] = { arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 };
    for (const app of platformsForReceiver(receiver)) {
      receiverMap[receiver][app] = { arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 };
    }
  }

  let nettoTotale = 0;
  let inArrivoTotale = 0;
  let daCompletareTotale = 0;
  let amazonTotale = 0;
  let amazonArrivato = 0;
  let amazonInArrivo = 0;
  let amazonDaCompletare = 0;
  let failCount = 0;
  let totalePercentoAffiliati = 0;
  let speseTotali = 0;
  let completatiCount = 0;
  let inArrivoCount = 0;
  let daCompletareCount = 0;

  for (const row of bonuses) {
    const piattaforma = row.piattaforma.trim().toUpperCase();
    const stato = row.stato.trim();
    const ricevente = row.ricevente.trim();
    const affiliato = row.affiliati.trim();
    const { spese, amazon, netto } = row;
    amazonTotale += amazon;

    if (stato === "Bonus arrivato") {
      nettoTotale += netto;
      speseTotali += spese;
      completatiCount += 1;
      amazonArrivato += amazon;
    } else if (stato === "Bonus in arrivo") {
      inArrivoTotale += netto;
      inArrivoCount += 1;
      amazonInArrivo += amazon;
    } else if (stato === "Registrato da completare") {
      daCompletareTotale += netto;
      daCompletareCount += 1;
      amazonDaCompletare += amazon;
    } else if (stato === "FAIL") {
      failCount += 1;
    }

    if (affiliato) {
      const rate = affiliateRates[affiliato.toUpperCase()] ?? DEFAULT_AFFILIATE_RATE;
      totalePercentoAffiliati += netto * rate;
    }

    if (receiverMap[ricevente]?.[piattaforma] && statusToKey[stato]) {
      const statusKey = statusToKey[stato];
      receiverMap[ricevente][piattaforma][statusKey] += netto;
      receiverMap[ricevente][piattaforma].amazon += amazon;
      receiverAmazonByStatus[ricevente][statusKey] += amazon;
      receiverAmazonByStatus[ricevente].amazon += amazon;
    }
  }

  const riceventi: BilancioReceiverStats[] = receiverList.map((ricevente) => {
    const platformStats = platformsForReceiver(ricevente).map((app) => ({
      app,
      ...receiverMap[ricevente][app],
    }));
    const total = platformStats.reduce(
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
    const amazonRow = { app: "🎁 Amazon", ...receiverAmazonByStatus[ricevente] };
    return { ricevente, total, amazonRow, platforms: platformStats };
  });

  const overview: BilancioOverview = {
    nettoTotale,
    inArrivoTotale,
    daCompletareTotale,
    amazonTotale,
    amazonArrivato,
    amazonInArrivo,
    amazonDaCompletare,
    failCount,
    totalePercentoAffiliati,
    nettoMenoPercentoAffiliati: nettoTotale - totalePercentoAffiliati,
    speseTotali,
    completatiCount,
    inArrivoCount,
    daCompletareCount,
  };

  return { overview, riceventi };
}
