import { isOnOrAfterCutoff } from "./date";
import type { Role } from "./role";
import { getSupabase } from "./supabase";
import { initialsFor, nextPlatformColor, platformKeyFor, type PlatformConfig } from "@/config/platforms";
import type {
  AffiliatePayment,
  AffiliateSummary,
  BilancioDetail,
  BilancioOverview,
  BilancioReceiverPlatformStats,
  BilancioReceiverStats,
  BonusRecord,
  Lead,
  LiquiditaConfig,
  LiquiditaLedgerRow,
  LiquiditaOverview,
  NewBonusPayload,
  NewReminderPayload,
  PlatformStat,
  ReceiverLinkDetail,
  Reminder,
  SavedLink,
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
const AFFILIATE_FALLBACK = ["Salvo Coco"];

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

type CustomPlatformRow = {
  key: string;
  label: string;
  short: string;
  color: string;
  bonus_default: number | string;
  spese_default: number | string;
  amazon_default: number | string;
};

function mapCustomPlatform(row: CustomPlatformRow): PlatformConfig {
  return {
    key: row.key,
    label: row.label,
    short: row.short,
    color: row.color,
    bonusDefault: num(row.bonus_default),
    speseDefault: num(row.spese_default),
    amazonDefault: num(row.amazon_default),
  };
}

export async function readCustomPlatforms(): Promise<PlatformConfig[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("custom_platforms")
    .select("key,label,short,color,bonus_default,spese_default,amazon_default")
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CustomPlatformRow[] | null)?.map(mapCustomPlatform) ?? [];
}

/** Crea una nuova piattaforma personalizzata, con colore e iniziali generati automaticamente. */
export async function insertCustomPlatform(payload: {
  label: string;
  bonus: number;
  spese: number;
  amazon: number;
}): Promise<PlatformConfig> {
  const label = payload.label.trim();
  if (!label) throw new Error("Nome piattaforma obbligatorio.");
  const key = platformKeyFor(label);

  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("custom_platforms")
    .select("id", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);

  const row = {
    key,
    label,
    short: initialsFor(label),
    color: nextPlatformColor(count ?? 0),
    bonus_default: payload.bonus,
    spese_default: payload.spese,
    amazon_default: payload.amazon,
  };

  const { data, error } = await supabase
    .from("custom_platforms")
    .insert(row)
    .select("key,label,short,color,bonus_default,spese_default,amazon_default")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Esiste già una piattaforma con questo nome.");
    throw new Error(error.message);
  }
  return mapCustomPlatform(data as CustomPlatformRow);
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

/** Statistiche per piattaforma (conteggio link totali + riceventi attivi), calcolate al volo dai bonus. */
export async function readPlatformStats(): Promise<PlatformStat[]> {
  const bonuses = await readBonusRows();
  const acc = new Map<string, { total: number; riceventi: Set<string> }>();
  for (const row of bonuses) {
    const key = row.piattaforma.trim().toUpperCase();
    if (!key) continue;
    const entry = acc.get(key) ?? { total: 0, riceventi: new Set<string>() };
    entry.total += 1;
    const ricevente = row.ricevente.trim().toLowerCase();
    if (ricevente) entry.riceventi.add(ricevente);
    acc.set(key, entry);
  }
  return [...acc.entries()].map(([key, entry]) => ({
    key,
    total: entry.total,
    attivi: entry.riceventi.size,
  }));
}

type ReceiverMetaRow = {
  piattaforma: string;
  ricevente: string;
  maxed: boolean | null;
};

async function readReceiverMeta(piattaformaUpper: string): Promise<Map<string, { maxed: boolean }>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("receiver_link_meta")
    .select("piattaforma,ricevente,maxed")
    .eq("piattaforma", piattaformaUpper);
  if (error) throw new Error(error.message);
  const map = new Map<string, { maxed: boolean }>();
  for (const row of (data as ReceiverMetaRow[] | null) ?? []) {
    map.set(row.ricevente.trim().toLowerCase(), { maxed: Boolean(row.maxed) });
  }
  return map;
}

/** Aggiorna/crea i metadati (link/codice tramite `links`, soldi ritirati, maxed) di un ricevente su una piattaforma. */
export async function upsertReceiverMeta(payload: {
  piattaforma: string;
  ricevente: string;
  soldiRitirati?: number;
  maxed?: boolean;
}): Promise<void> {
  const piattaforma = payload.piattaforma.trim().toUpperCase();
  const ricevente = payload.ricevente.trim();
  if (!piattaforma || !ricevente) throw new Error("Piattaforma e ricevente obbligatori.");
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from("receiver_link_meta")
    .select("id")
    .ilike("piattaforma", piattaforma)
    .ilike("ricevente", ricevente)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  const patch: Record<string, number | boolean> = {};
  if (payload.soldiRitirati !== undefined) patch.soldi_ritirati = payload.soldiRitirati;
  if (payload.maxed !== undefined) patch.maxed = payload.maxed;

  if (existing) {
    const { error } = await supabase
      .from("receiver_link_meta")
      .update(patch)
      .eq("id", (existing as { id: number }).id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("receiver_link_meta")
      .insert({ piattaforma, ricevente, ...patch });
    if (error) throw new Error(error.message);
  }
}

/** Trova (se esiste) il link/codice salvato per intestatario+piattaforma e lo aggiorna, altrimenti lo crea. */
export async function upsertReceiverLinkValue(
  piattaforma: string,
  intestatario: string,
  url: string,
): Promise<SavedLink> {
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from("links")
    .select("id,piattaforma,intestatario,url,created_at")
    .ilike("piattaforma", piattaforma)
    .ilike("intestatario", intestatario)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { data, error } = await supabase
      .from("links")
      .update({ url })
      .eq("id", (existing as LinkRow).id)
      .select("id,piattaforma,intestatario,url,created_at")
      .single();
    if (error) throw new Error(error.message);
    return mapLink(data as LinkRow);
  }
  return insertLink({ piattaforma, intestatario, url });
}

/** Per un bonus (piattaforma), elenco riceventi ATTIVI (con almeno un link) con dettagli completi. */
export async function getReceiverLinks(piattaformaUpper: string): Promise<ReceiverLinkDetail[]> {
  const [bonuses, savedLinks, meta, prelievi] = await Promise.all([
    readBonusRows(),
    readLinks(piattaformaUpper),
    readReceiverMeta(piattaformaUpper),
    sumPrelieviPerRicevente(),
  ]);

  const acc = new Map<string, { ricevente: string; count: number; soldiSulConto: number }>();
  for (const row of bonuses) {
    if (row.piattaforma.trim().toUpperCase() !== piattaformaUpper) continue;
    const ricevente = row.ricevente.trim();
    if (!ricevente) continue;
    const key = ricevente.toLowerCase();
    const entry = acc.get(key) ?? { ricevente, count: 0, soldiSulConto: 0 };
    entry.count += 1;
    entry.soldiSulConto += row.bonus;
    acc.set(key, entry);
  }

  const linkByReceiver = new Map<string, string>();
  for (const link of savedLinks) {
    const key = link.intestatario.trim().toLowerCase();
    if (!linkByReceiver.has(key)) linkByReceiver.set(key, link.url);
  }

  return [...acc.values()]
    .map(({ ricevente, count, soldiSulConto }) => {
      const key = ricevente.toLowerCase();
      const receiverMeta = meta.get(key) ?? { maxed: false };
      const soldiRitirati = prelievi.get(prelievoRiferimento(piattaformaUpper, ricevente)) ?? 0;
      return {
        ricevente,
        count,
        maxed: receiverMeta.maxed,
        linkOCodice: linkByReceiver.get(key) ?? "",
        soldiSulConto,
        soldiRitirati,
        soldiDaPrelevare: soldiSulConto - soldiRitirati,
      };
    })
    .sort((a, b) => a.ricevente.localeCompare(b.ricevente, "it", { sensitivity: "base" }));
}

export async function readBilancioStats(scope: DataScope = "current"): Promise<{
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
  detail: BilancioDetail;
}> {
  const [bonuses, affiliateRates, links, customPlatforms] = await Promise.all([
    readBonusRows(scope),
    readAffiliateRates(),
    readLinks(),
    readCustomPlatforms(),
  ]);

  const baseReceivers = [
    "Lori",
    "Diego",
    "Cusi",
    "Ludovica",
    "Rubi",
    "MATTIA RUSSO",
    "Luca pietra",
    "Alessia longo",
  ];
  const knownReceiversLower = new Set(baseReceivers.map((name) => name.toLowerCase()));
  const extraReceivers: string[] = [];
  for (const link of links) {
    const nome = link.intestatario.trim();
    if (!nome) continue;
    const lower = nome.toLowerCase();
    if (knownReceiversLower.has(lower)) continue;
    knownReceiversLower.add(lower);
    extraReceivers.push(nome);
  }
  const receiverList = [...baseReceivers, ...extraReceivers];
  const fullPlatformList = [
    "COINBASE",
    "BUDDYBANK",
    "BBVA",
    "REVOLUT",
    "ING",
    "MYFIN",
    ...customPlatforms.map((p) => p.key),
  ];
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

  const bonusInArrivo: BonusRecord[] = [];
  const bonusDaCompletare: BonusRecord[] = [];
  const amazonInArrivoList: BonusRecord[] = [];
  const amazonDaCompletareList: BonusRecord[] = [];
  const affiliatiTotals = new Map<string, number>();
  const speseByPlatform = new Map<string, number>();

  for (const row of bonuses) {
    const piattaforma = row.piattaforma.trim().toUpperCase();
    const stato = row.stato.trim();
    const ricevente = row.ricevente.trim();
    const affiliato = row.affiliati.trim();
    const { spese, amazon, netto } = row;
    amazonTotale += amazon;

    // Spese: contate solo per bonus "in arrivo" o "arrivato".
    if (stato === "Bonus arrivato" || stato === "Bonus in arrivo") {
      speseTotali += spese;
      speseByPlatform.set(piattaforma, (speseByPlatform.get(piattaforma) ?? 0) + spese);
    }

    if (stato === "Bonus arrivato") {
      nettoTotale += netto;
      completatiCount += 1;
      amazonArrivato += amazon;
      // % Affiliati: contata solo per bonus "arrivato".
      if (affiliato) {
        const rate = affiliateRates[affiliato.toUpperCase()] ?? DEFAULT_AFFILIATE_RATE;
        const quota = netto * rate;
        totalePercentoAffiliati += quota;
        affiliatiTotals.set(affiliato, (affiliatiTotals.get(affiliato) ?? 0) + quota);
      }
    } else if (stato === "Bonus in arrivo") {
      // "In arrivo" = importo LORDO del bonus (spese pagate a parte, la piattaforma paga il bonus intero).
      inArrivoTotale += row.bonus;
      inArrivoCount += 1;
      amazonInArrivo += amazon;
      bonusInArrivo.push(row);
      if (amazon > 0) amazonInArrivoList.push(row);
    } else if (stato === "Registrato da completare") {
      daCompletareTotale += netto;
      daCompletareCount += 1;
      amazonDaCompletare += amazon;
      bonusDaCompletare.push(row);
      if (amazon > 0) amazonDaCompletareList.push(row);
    } else if (stato === "FAIL") {
      failCount += 1;
    }

    if (receiverMap[ricevente]?.[piattaforma] && statusToKey[stato]) {
      const statusKey = statusToKey[stato];
      // "arrivo" (Bonus in arrivo) usa il lordo, coerente con inArrivoTotale sopra; le altre colonne restano a netto.
      const amount = stato === "Bonus in arrivo" ? row.bonus : netto;
      receiverMap[ricevente][piattaforma][statusKey] += amount;
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

  const detail: BilancioDetail = {
    bonusInArrivo,
    bonusDaCompletare,
    amazonInArrivo: amazonInArrivoList,
    amazonDaCompletare: amazonDaCompletareList,
    affiliati: [...affiliatiTotals.entries()]
      .map(([nome, totale]) => ({ nome, totale }))
      .sort((a, b) => b.totale - a.totale),
    spese: [...speseByPlatform.entries()]
      .map(([piattaforma, totale]) => ({ piattaforma, totale }))
      .sort((a, b) => b.totale - a.totale),
  };

  return { overview, riceventi, detail };
}

type LinkRow = {
  id: number;
  piattaforma: string;
  intestatario: string;
  url: string;
  created_at: string;
};

function mapLink(row: LinkRow): SavedLink {
  return {
    id: row.id,
    piattaforma: row.piattaforma ?? "",
    intestatario: row.intestatario ?? "",
    url: row.url ?? "",
    createdAt: row.created_at ?? "",
  };
}

export async function readLinks(piattaforma?: string): Promise<SavedLink[]> {
  const supabase = getSupabase();
  let query = supabase.from("links").select("id,piattaforma,intestatario,url,created_at");
  if (piattaforma) query = query.eq("piattaforma", piattaforma);
  const { data, error } = await query.order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LinkRow[] | null)?.map(mapLink) ?? [];
}

export async function insertLink(payload: {
  piattaforma: string;
  intestatario: string;
  url: string;
}): Promise<SavedLink> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("links")
    .insert({
      piattaforma: payload.piattaforma,
      intestatario: payload.intestatario,
      url: payload.url,
    })
    .select("id,piattaforma,intestatario,url,created_at")
    .single();
  if (error) throw new Error(error.message);
  return mapLink(data as LinkRow);
}

type LeadRow = {
  id: number;
  nome: string;
  telefono: string;
  descrizione: string;
  bonus_interesse: string[] | null;
  created_at: string;
};

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    nome: row.nome ?? "",
    telefono: row.telefono ?? "",
    descrizione: row.descrizione ?? "",
    bonusInteresse: row.bonus_interesse ?? [],
    createdAt: row.created_at ?? "",
  };
}

const LEAD_COLUMNS = "id,nome,telefono,descrizione,bonus_interesse,created_at";

export async function readLeads(): Promise<Lead[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LeadRow[] | null)?.map(mapLead) ?? [];
}

export async function insertLead(payload: {
  nome: string;
  telefono: string;
  descrizione: string;
  bonusInteresse: string[];
}): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      nome: payload.nome,
      telefono: payload.telefono,
      descrizione: payload.descrizione,
      bonus_interesse: payload.bonusInteresse,
    })
    .select(LEAD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapLead(data as LeadRow);
}

export async function updateLead(
  id: number,
  payload: { nome: string; telefono: string; descrizione: string; bonusInteresse: string[] },
): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .update({
      nome: payload.nome,
      telefono: payload.telefono,
      descrizione: payload.descrizione,
      bonus_interesse: payload.bonusInteresse,
    })
    .eq("id", id)
    .select(LEAD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapLead(data as LeadRow);
}

export async function deleteLead(id: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

type ReminderBonusRow = {
  piattaforma: string;
  persona_invitata: string;
  ricevente: string;
  stato: string;
};

type ReminderLeadRow = {
  nome: string;
  telefono: string;
};

type ReminderRow = {
  id: string;
  bonus_id: number | null;
  lead_id: number | null;
  data_promemoria: string;
  descrizione: string;
  completato: boolean;
  created_at: string;
  bonuses: ReminderBonusRow | null;
  leads: ReminderLeadRow | null;
};

const REMINDER_COLUMNS =
  "id,bonus_id,lead_id,data_promemoria,descrizione,completato,created_at," +
  "bonuses(piattaforma,persona_invitata,ricevente,stato),leads(nome,telefono)";

/** Giorni di anzianità oltre i quali i promemoria (fatti o scaduti) vengono eliminati automaticamente. */
const REMINDER_RETENTION_DAYS = 60;

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    bonusId: row.bonus_id,
    leadId: row.lead_id,
    dataPromemoria: row.data_promemoria,
    descrizione: row.descrizione ?? "",
    completato: Boolean(row.completato),
    createdAt: row.created_at ?? "",
    bonus: row.bonuses
      ? {
          piattaforma: row.bonuses.piattaforma ?? "",
          personaInvitata: row.bonuses.persona_invitata ?? "",
          ricevente: row.bonuses.ricevente ?? "",
          stato: row.bonuses.stato ?? "",
        }
      : null,
    lead: row.leads
      ? {
          nome: row.leads.nome ?? "",
          telefono: row.leads.telefono ?? "",
        }
      : null,
  };
}

/**
 * Elimina i promemoria più vecchi della soglia di retention (60 giorni), sia fatti che scaduti.
 * Eseguita ad ogni lettura invece che con un job schedulato: l'app non ha bisogno di infrastruttura
 * aggiuntiva (pg_cron/Edge Function) e la pagina Promemoria è l'unico punto da cui si leggono questi
 * dati, quindi la pulizia resta comunque puntuale ad ogni apertura della pagina.
 */
const CUTOFF_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function cleanupOldReminders(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REMINDER_RETENTION_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  // Guardia di sicurezza: mai eseguire la delete se il filtro data non è un "YYYY-MM-DD" valido e sensato
  // (né nel passato remoto né nel futuro), per evitare in ogni caso una .lt() senza reale limite superiore.
  const todayIso = new Date().toISOString().slice(0, 10);
  if (!CUTOFF_DATE_RE.test(cutoffIso) || cutoffIso >= todayIso) {
    throw new Error("Data di cutoff per la pulizia promemoria non valida: pulizia annullata.");
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("promemoria").delete().lt("data_promemoria", cutoffIso);
  if (error) throw new Error(error.message);
}

export async function readReminders(): Promise<Reminder[]> {
  await cleanupOldReminders();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("promemoria")
    .select(REMINDER_COLUMNS)
    .order("data_promemoria", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as ReminderRow[] | null)?.map(mapReminder) ?? [];
}

export async function insertReminder(payload: NewReminderPayload): Promise<Reminder> {
  const descrizione = payload.descrizione.trim();
  if (!descrizione) throw new Error("La descrizione è obbligatoria.");
  if (!payload.dataPromemoria.trim()) throw new Error("La data è obbligatoria.");
  if (payload.bonusId && payload.leadId) {
    throw new Error("Un promemoria può essere collegato a un bonus o a un lead, non entrambi.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("promemoria")
    .insert({
      bonus_id: payload.bonusId,
      lead_id: payload.leadId,
      data_promemoria: payload.dataPromemoria,
      descrizione,
    })
    .select(REMINDER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapReminder(data as unknown as ReminderRow);
}

export async function updateReminder(
  id: string,
  patch: Partial<{
    dataPromemoria: string;
    descrizione: string;
    completato: boolean;
    bonusId: number | null;
    leadId: number | null;
  }>,
): Promise<Reminder> {
  const update: Record<string, string | boolean | number | null> = {};
  if (patch.dataPromemoria !== undefined) update.data_promemoria = patch.dataPromemoria;
  if (patch.descrizione !== undefined) update.descrizione = patch.descrizione.trim();
  if (patch.completato !== undefined) update.completato = patch.completato;
  if (patch.bonusId !== undefined) update.bonus_id = patch.bonusId;
  if (patch.leadId !== undefined) update.lead_id = patch.leadId;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("promemoria")
    .update(update)
    .eq("id", id)
    .select(REMINDER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapReminder(data as unknown as ReminderRow);
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("promemoria").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------------ */
/* Liquidità: cassa reale disponibile, separata dai soldi ancora sui conti. */
/* ------------------------------------------------------------------------ */

type LiquiditaConfigRow = {
  valore_iniziale: number | string;
  data_attivazione: string;
};

export async function readLiquiditaConfig(): Promise<LiquiditaConfig | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("liquidita_config")
    .select("valore_iniziale,data_attivazione")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as LiquiditaConfigRow;
  return { valoreIniziale: num(row.valore_iniziale), dataAttivazione: (row.data_attivazione ?? "").trim() };
}

export async function upsertLiquiditaConfig(payload: LiquiditaConfig): Promise<void> {
  if (!payload.dataAttivazione.trim()) throw new Error("Data di attivazione obbligatoria.");
  if (!Number.isFinite(payload.valoreIniziale)) throw new Error("Valore iniziale non valido.");
  const supabase = getSupabase();
  const { error } = await supabase.from("liquidita_config").upsert({
    id: 1,
    valore_iniziale: payload.valoreIniziale,
    data_attivazione: payload.dataAttivazione,
  });
  if (error) throw new Error(error.message);
}

type LiquiditaMovimentoRow = {
  id: string;
  tipo: string;
  importo: number | string;
  descrizione: string | null;
  riferimento: string | null;
  created_at: string;
};

function mapMovimento(row: LiquiditaMovimentoRow): LiquiditaLedgerRow {
  return {
    id: row.id,
    tipo: (row.tipo as LiquiditaLedgerRow["tipo"]) ?? "prelievo",
    importo: num(row.importo),
    descrizione: row.descrizione ?? "",
    riferimento: row.riferimento,
    data: (row.created_at ?? "").slice(0, 10),
  };
}

export async function readLiquiditaMovimenti(): Promise<LiquiditaLedgerRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("liquidita_movimenti")
    .select("id,tipo,importo,descrizione,riferimento,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LiquiditaMovimentoRow[] | null)?.map(mapMovimento) ?? [];
}

export async function insertLiquiditaMovimento(payload: {
  tipo: "prelievo" | "spesa" | "iniziale" | "rettifica";
  importo: number;
  descrizione: string;
  riferimento?: string | null;
}): Promise<void> {
  if (!Number.isFinite(payload.importo) || payload.importo === 0) {
    throw new Error("Importo non valido.");
  }
  const supabase = getSupabase();
  const { error } = await supabase.from("liquidita_movimenti").insert({
    tipo: payload.tipo,
    importo: payload.importo,
    descrizione: payload.descrizione.trim(),
    riferimento: payload.riferimento ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Chiave "riferimento" usata dai movimenti di prelievo legati a una card ricevente del Link. */
export function prelievoRiferimento(piattaforma: string, ricevente: string): string {
  return `${piattaforma.trim().toUpperCase()}::${ricevente.trim()}`;
}

/** Somma dei prelievi per ogni coppia piattaforma/ricevente (chiave = prelievoRiferimento). */
export async function sumPrelieviPerRicevente(): Promise<Map<string, number>> {
  const movimenti = await readLiquiditaMovimenti();
  const map = new Map<string, number>();
  for (const m of movimenti) {
    if (m.tipo !== "prelievo" || !m.riferimento) continue;
    map.set(m.riferimento, (map.get(m.riferimento) ?? 0) + m.importo);
  }
  return map;
}

/**
 * Liquidità = valore_iniziale − spese (bonus con data ≥ data_attivazione, TUTTI gli stati incluso FAIL)
 * + prelievi (movimenti 'prelievo'; 'rettifica' è trattata come 'prelievo' nella formula: correzione
 * manuale del saldo, usata anche dalla migrazione per non perdere i vecchi valori di "soldi ritirati").
 * I buoni Amazon non entrano mai nel calcolo: non sono cassa.
 */
export async function getLiquiditaOverview(options?: { includeLedger?: boolean }): Promise<LiquiditaOverview> {
  const includeLedger = options?.includeLedger ?? true;
  const [config, bonuses, movimenti] = await Promise.all([
    readLiquiditaConfig(),
    readBonusRows("all"),
    readLiquiditaMovimenti(),
  ]);

  const amazonTotale = bonuses.reduce((sum, b) => sum + b.amazon, 0);

  if (!config) {
    return {
      config: null,
      valoreIniziale: 0,
      speseDedotte: 0,
      prelieviTotali: 0,
      valore: 0,
      amazonTotale,
      ledger: includeLedger ? movimenti : [],
    };
  }

  const bonusRilevanti = bonuses.filter((b) => b.data >= config.dataAttivazione);
  const speseDedotte = bonusRilevanti.reduce((sum, b) => sum + b.spese, 0);

  const prelieviTotali = movimenti
    .filter((m) => m.tipo === "prelievo" || m.tipo === "rettifica")
    .reduce((sum, m) => sum + m.importo, 0);

  const valore = config.valoreIniziale - speseDedotte + prelieviTotali;

  let ledger: LiquiditaLedgerRow[] = [];
  if (includeLedger) {
    const speseLedger: LiquiditaLedgerRow[] = bonusRilevanti
      .filter((b) => b.spese > 0)
      .map((b) => ({
        id: `spesa-bonus-${b.id}`,
        tipo: "spesa",
        importo: -b.spese,
        descrizione: `Spesa ${b.piattaforma} · ${b.personaInvitata || b.ricevente || "—"}`,
        riferimento: `bonus:${b.id}`,
        data: b.data,
      }));
    ledger = [...movimenti, ...speseLedger].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  }

  return { config, valoreIniziale: config.valoreIniziale, speseDedotte, prelieviTotali, valore, amazonTotale, ledger };
}
