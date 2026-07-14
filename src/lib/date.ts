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
