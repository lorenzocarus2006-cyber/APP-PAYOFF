const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const IT_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * I bonus storici migrati dal foglio hanno la data in formato "DD/MM/YYYY" (o vuota/testo libero).
 * Il form dell'app scrive invece "YYYY-MM-DD" (input type=date). Servono entrambi i formati.
 */
export function parseFlexibleDate(value: string): Date | null {
  const v = value.trim();
  const iso = ISO_RE.exec(v);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const it = IT_RE.exec(v);
  if (it) {
    const [, d, m, y] = it;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

/** Giorno in cui Salvo è entrato nel gruppo: taglio fisso, non una finestra scorrevole. */
export const SALVO_CUTOFF = new Date(2026, 6, 14);

/**
 * true solo se la data è valida e riconoscibile come >= cutoff.
 * Date vuote/testo libero/non parsabili ricadono sempre nel "vecchio" (scelta prudente per la privacy di Salvo).
 */
export function isOnOrAfterCutoff(value: string): boolean {
  const parsed = parseFlexibleDate(value);
  return parsed !== null && parsed.getTime() >= SALVO_CUTOFF.getTime();
}

const IT_MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Data "YYYY-MM-DD" per il giorno corrente, in ora locale (non UTC). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Ritorna "-" se la data non è valida. */
export function formatItalianDate(iso: string): string {
  const isoMatch = ISO_RE.exec(iso.trim());
  if (!isoMatch) return "-";
  const [, y, m, d] = isoMatch;
  return `${d}/${m}/${y}`;
}

/** "YYYY-MM-DD" -> "20 giugno" (aggiunge l'anno solo se diverso da quello corrente). */
export function formatDayHeader(iso: string): string {
  const isoMatch = ISO_RE.exec(iso.trim());
  if (!isoMatch) return iso;
  const [, y, m, d] = isoMatch;
  const day = Number(d);
  const month = IT_MONTHS[Number(m) - 1] ?? "";
  const currentYear = new Date().getFullYear();
  const year = Number(y);
  return year === currentYear ? `${day} ${month}` : `${day} ${month} ${year}`;
}

/** true se la data (YYYY-MM-DD) è precedente a oggi. */
export function isPastDate(iso: string): boolean {
  return iso.trim() < todayISO();
}
