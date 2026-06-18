# HANDOFF — Stato lavori APP-PAYOFF

Riepilogo per continuare in una nuova chat. Aggiornato: 2026-06-18.

---

## Cosa è stato fatto (committabile, già nel working tree)

### 1. Home — pulsanti filtro mobile ([src/app/page.tsx](src/app/page.tsx))
- Pulsanti filtro (Bonus / Stato / Data) rimpiccioliti: `px-3 py-1.5 text-[13px]`, tolto `min-h-12`.
- Menu dropdown: scroll mobile fluido (`overscroll-contain`, `-webkit-overflow-scrolling:touch`), `max-h-60`.
- Sezione "Cerca persona" → `relative z-40` per disegnare i menu **sopra** le card risultati
  (prima il `backdrop-blur` della sezione intrappolava il menu sotto le card).
- Menu dropdown → `pb-24`: gli ultimi item (ISYBANK/ING/FAIL) salgono sopra la **navbar fissa**
  (BottomNav è `fixed bottom-0 z-50`, alta 60px) e diventano cliccabili.
- **Rimosso** il pulsante ordina A→Z. Restano 3 pulsanti su una riga: Bonus, Stato, Data.
  Label data accorciata: "📅 Recenti" / "📅 Vecchie".
  - NOTA: la logica sort `alpha-asc`/`alpha-desc` è ancora nel codice ma inattiva (nessun bottone).
    Si può ripulire il tipo `SortMode` se si vuole.

### 2. Panoramica Link — lettura colonne ([src/lib/sheets.ts](src/lib/sheets.ts), `readLinkOverviewRows`)
- BUG risolto: ING mostrava 0. Causa doppia:
  1. Header NON è riga 0 — riga 0 = titolo, riga 2 = header reale.
  2. Mapping per indice fisso ometteva KRAKEN → ING (col I) letto dalla col sbagliata (H).
- FIX: trovo la riga header dinamicamente (cella esattamente `"INTESTATARIO"`, match esatto perché
  il titolo contiene "Intestatario" in una frase), poi mappo le colonne **per nome header**.
  Range allargato `A:I` → `A:Z`. KRAKEN resta esclusa dalla tabella (scelta utente).

### 3. Panoramica Link — conteggio ING ricalcolato ([src/lib/sheets.ts](src/lib/sheets.ts))
- Il foglio non conteggiava bene gli ING → li **ricalcolo dal foglio "aprile"** con `countIngLinks()`.
- Conta gli ING per **ricevente** (colonna D), in **TUTTI gli stati, FAIL incluso**.
- L'override sostituisce il valore ING letto dal foglio panoramica.
- RISOLTO: gli ING che "mancavano" erano righe senza ricevente compilato nel foglio
  (errore di inserimento dati, sistemato dall'utente, non un bug del codice).

---

## Stato: nessun problema aperto

Tutte le richieste finora sono completate. Prossimi sviluppi: da definire.

---

## Come far girare in locale
- `npm run dev -- -p 3005` (3000/3001 spesso occupate). Pagine `force-dynamic`, dati live dal Google Sheet.
- Env in `.env.local`: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SPREADSHEET_ID`.
- Fogli usati: `aprile` (dati bonus), `PANORAMICA LINK`, `REGISTRO AFFILIATI`.

## File chiave
- [src/app/page.tsx](src/app/page.tsx) — Home, filtri, modal.
- [src/lib/sheets.ts](src/lib/sheets.ts) — tutta la logica Google Sheets.
- [src/app/panoramica-link/page.tsx](src/app/panoramica-link/page.tsx) — tabella Panoramica.
- [src/components/BottomNav.tsx](src/components/BottomNav.tsx) — navbar fissa.
