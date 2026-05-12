import { google } from "googleapis";
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

const SHEET_NAME = "aprile";
const COLS_A_TO_K = "A:K";
const COLS_A_TO_J = "A:J";
const LINK_OVERVIEW_SHEET_NAME = "PANORAMICA LINK";
const LINK_OVERVIEW_RANGE = "A:I";
const AFFILIATES_SHEET_NAME = "REGISTRO AFFILIATI";
const AFFILIATES_PAYMENTS_RANGE = "A5:E";
const APRILE_AFFILIATES_RANGE = "G:K";
const AFFILIATE_NAMES = [
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
  "EXTRA6",
  "EXTRA7",
] as const;

const env = {
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  spreadsheetId: process.env.SPREADSHEET_ID,
};

function assertEnv() {
  if (!env.email || !env.privateKey || !env.spreadsheetId) {
    throw new Error(
      "Configurazione Google Sheets incompleta: controlla GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e SPREADSHEET_ID in .env.local",
    );
  }
}

async function getSheetsClient() {
  assertEnv();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.email,
      private_key: env.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCell(row: string[], idx: number): string {
  return row[idx] ?? "";
}

export async function readBonusRows(): Promise<BonusRecord[]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId!,
    range: `${SHEET_NAME}!${COLS_A_TO_K}`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values ?? [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map((row, index) => {
    const bonus = parseNumber(getCell(row, 7));
    const spese = parseNumber(getCell(row, 8));
    const amazon = parseNumber(getCell(row, 9));
    const nettoSheet = parseNumber(getCell(row, 10));

    return {
      rowNumber: index + 2,
      piattaforma: getCell(row, 0),
      personaInvitata: getCell(row, 1),
      stato: getCell(row, 2),
      ricevente: getCell(row, 3),
      data: getCell(row, 4).trim(),
      info: getCell(row, 5),
      affiliati: getCell(row, 6),
      bonus,
      spese,
      amazon,
      netto: nettoSheet,
    };
  });
}

export async function appendBonusRow(payload: NewBonusPayload) {
  const row: Array<string | number> = [
    payload.piattaforma,
    payload.personaInvitata,
    payload.stato,
    payload.ricevente,
    payload.data,
    payload.info,
    payload.affiliati,
    payload.bonus,
    payload.spese,
    payload.amazon,
  ];
  await appendBonusValues(row);
}

export async function appendBonusValues(row: Array<string | number>) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.spreadsheetId!,
    range: `${SHEET_NAME}!${COLS_A_TO_J}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    requestBody: { values: [row] },
  });
}

type AppendOptions = {
  range?: string;
  insertDataOption?: "OVERWRITE" | "INSERT_ROWS";
};

export async function appendValues(
  row: Array<string | number>,
  options?: AppendOptions,
) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.spreadsheetId!,
    range: options?.range ?? `${SHEET_NAME}!${COLS_A_TO_J}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: options?.insertDataOption ?? "OVERWRITE",
    requestBody: { values: [row] },
  });
}

function colToLetter(col: number | string): string {
  if (typeof col === "string") return col.toUpperCase();
  if (!Number.isInteger(col) || col < 1) {
    throw new Error("La colonna deve essere un numero >= 1 o una lettera.");
  }
  return String.fromCharCode(64 + col);
}

export async function updateCellValue(
  row: number,
  col: number | string,
  value: string,
) {
  if (!Number.isInteger(row) || row < 2) {
    throw new Error("Il numero riga deve essere >= 2.");
  }

  const colLetter = colToLetter(col);
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: env.spreadsheetId!,
    range: `${SHEET_NAME}!${colLetter}${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
}

export async function readLinkOverviewRows(): Promise<LinkOverviewRow[]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId!,
    range: `${LINK_OVERVIEW_SHEET_NAME}!${LINK_OVERVIEW_RANGE}`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];
  if (rows.length <= 1) return [];

  const allowedIntestatari = new Set([
    "Lori",
    "Diego",
    "poma",
    "Cusi",
    "Ludovica",
    "Rubi",
    "MATTIA RUSSO",
    "Luca pietra",
    "Extra3",
    "Extra4",
    "Extra5",
  ]);

  return rows
    .slice(1)
    .map((row) => ({
      intestatario: getCell(row, 0),
      coinbase: parseNumber(getCell(row, 1)),
      bbva: parseNumber(getCell(row, 2)),
      binance: parseNumber(getCell(row, 3)),
      buddybank: parseNumber(getCell(row, 4)),
      isybank: parseNumber(getCell(row, 5)),
      revolut: parseNumber(getCell(row, 6)),
      ing: parseNumber(getCell(row, 7)),
    }))
    .filter(
      (row) =>
        row.intestatario &&
        row.intestatario.toUpperCase() !== "TOTALE" &&
        !row.intestatario.toUpperCase().startsWith("EXTRA") &&
        allowedIntestatari.has(row.intestatario),
    );
}

export async function readAffiliatesData(): Promise<{
  summaries: AffiliateSummary[];
  payments: AffiliatePayment[];
}> {
  const sheets = await getSheetsClient();
  const paymentsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId!,
    range: `${AFFILIATES_SHEET_NAME}!${AFFILIATES_PAYMENTS_RANGE}`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const aprileResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId!,
    range: `${SHEET_NAME}!${APRILE_AFFILIATES_RANGE}`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const paymentRows = (paymentsResponse.data.values ?? [])
    .map((row) => ({
      affiliato: getCell(row, 0).trim(),
      importo: parseNumber(getCell(row, 1)),
      data: getCell(row, 2).trim(),
      modalita: getCell(row, 3).trim(),
      note: getCell(row, 4).trim(),
    }))
    .filter((row) => row.affiliato);

  const paymentByAffiliate = paymentRows.reduce<Record<string, AffiliatePayment[]>>(
    (acc, payment) => {
      const key = payment.affiliato.toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(payment);
      return acc;
    },
    {},
  );
  const generatedByAffiliate = (aprileResponse.data.values ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      const affiliateName = getCell(row, 0).trim().toUpperCase();
      if (!affiliateName) return acc;
      const netto = parseNumber(getCell(row, 4));
      const rate = affiliateName === "PEPI" ? 0.25 : 0.2;
      acc[affiliateName] = (acc[affiliateName] ?? 0) + netto * rate;
      return acc;
    },
    {},
  );

  const summaries = AFFILIATE_NAMES.map((nome) => {
    const key = nome.toUpperCase();
    const affiliatePayments = paymentByAffiliate[key] ?? [];
    const pagato = affiliatePayments.reduce((sum, payment) => sum + payment.importo, 0);
    const generato = generatedByAffiliate[key] ?? 0;
    const daPagare = generato - pagato;
    return {
      nome,
      generato,
      pagato,
      daPagare,
      pagamentiCount: affiliatePayments.length,
    };
  });

  return { summaries, payments: paymentRows };
}

export function getAffiliatesPaymentsRange() {
  return `${AFFILIATES_SHEET_NAME}!${AFFILIATES_PAYMENTS_RANGE}`;
}

export async function readBilancioStats(): Promise<{
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
}> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.spreadsheetId!,
    range: `${SHEET_NAME}!${COLS_A_TO_K}`,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values ?? [];
  if (rows.length <= 1) {
    return {
      overview: {
        nettoTotale: 0,
        inArrivoTotale: 0,
        daCompletareTotale: 0,
        failCount: 0,
        totalePercentoAffiliati: 0,
        nettoMenoPercentoAffiliati: 0,
        speseTotali: 0,
        completatiCount: 0,
        inArrivoCount: 0,
        daCompletareCount: 0,
      },
      riceventi: [],
    };
  }

  const receiverList = [
    "Lori",
    "Diego",
    "Cusi",
    "Ludovica",
    "Rubi",
    "MATTIA RUSSO",
    "Luca pietra",
  ];
  const platformList = ["COINBASE", "BUDDYBANK", "BBVA", "REVOLUT", "ISYBANK", "ING"];
  const statusToKey: Record<string, keyof Omit<BilancioReceiverPlatformStats, "app" | "amazon">> =
    {
      "Bonus arrivato": "arrivato",
      "Bonus in arrivo": "arrivo",
      "Registrato da completare": "daFare",
      FAIL: "fail",
    };

  const receiverMap: Record<
    string,
    Record<string, Omit<BilancioReceiverPlatformStats, "app">>
  > = {};
  for (const receiver of receiverList) {
    receiverMap[receiver] = {};
    for (const app of platformList) {
      receiverMap[receiver][app] = { arrivato: 0, arrivo: 0, daFare: 0, fail: 0, amazon: 0 };
    }
  }

  let nettoTotale = 0;
  let inArrivoTotale = 0;
  let daCompletareTotale = 0;
  let failCount = 0;
  let totalePercentoAffiliati = 0;
  let speseTotali = 0;
  let completatiCount = 0;
  let inArrivoCount = 0;
  let daCompletareCount = 0;

  for (const row of rows.slice(1)) {
    const piattaforma = getCell(row, 0).trim().toUpperCase();
    const stato = getCell(row, 2).trim();
    const ricevente = getCell(row, 3).trim();
    const affiliato = getCell(row, 6).trim();
    const spese = parseNumber(getCell(row, 8));
    const amazon = parseNumber(getCell(row, 9));
    const netto = parseNumber(getCell(row, 10));

    if (stato === "Bonus arrivato") {
      nettoTotale += netto;
      speseTotali += spese;
      completatiCount += 1;
    } else if (stato === "Bonus in arrivo") {
      inArrivoTotale += netto;
      inArrivoCount += 1;
    } else if (stato === "Registrato da completare") {
      daCompletareTotale += netto;
      daCompletareCount += 1;
    } else if (stato === "FAIL") {
      failCount += 1;
    }

    if (affiliato) {
      totalePercentoAffiliati += netto * 0.2;
    }

    if (
      receiverMap[ricevente] &&
      receiverMap[ricevente][piattaforma] &&
      statusToKey[stato]
    ) {
      const statusKey = statusToKey[stato];
      receiverMap[ricevente][piattaforma][statusKey] += netto;
      receiverMap[ricevente][piattaforma].amazon += amazon;
    }
  }

  const riceventi: BilancioReceiverStats[] = receiverList.map((ricevente) => {
    const platformStats = platformList.map((app) => ({
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
    return { ricevente, total, platforms: platformStats };
  });

  const overview: BilancioOverview = {
    nettoTotale,
    inArrivoTotale,
    daCompletareTotale,
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
