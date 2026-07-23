-- ============================================================================
-- Migrazione: pulizia riceventi legacy — 2026-07-23
-- Prima migrazione tracciata in supabase/migrations/ (la precedente, che ha
-- creato public.recipients/public.links.recipient_id, vive già applicata in
-- supabase/schema.sql — non esiste un vero "0000" da estrarre, questo file
-- riparte semplicemente da 0001 in questa cartella).
--
-- Idempotente: eseguibile più volte senza effetti collaterali. Nessun DROP,
-- nessun DELETE/TRUNCATE, nessun UPDATE non guardato. L'unica scrittura è un
-- soft-delete (`is_active = false`) su nomi espliciti.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DA ESEGUIRE MANUALMENTE PRIMA di applicare l'update sotto (query di sola
-- lettura, non fanno parte della migrazione idempotente):
-- ----------------------------------------------------------------------------

-- A) Quanti link/bonus verrebbero "nascosti" disattivando questi 9 nomi.
--    Rivedi la lista prima di procedere — nessuna riga qui sotto viene toccata
--    da questa migrazione, i link/bonus restano intatti in ogni caso.
--
--      select r.name, count(l.id) from public.recipients r
--      left join public.links l on l.recipient_id = r.id
--      where lower(btrim(r.name)) in (
--        'extra3','extra4','extra5','extra6','extra7','poma','cusi','ludovica','mattia russo'
--      )
--      group by r.name order by r.name;

-- B) Link il cui intestatario non ha NESSUN bonus corrispondente — oggi questi
--    erano visibili SOLO nella sezione "Link salvati" (rimossa in questo
--    task). getReceiverLinks() è stato esteso per includerli comunque nella
--    lista per-ricevente della pagina Link, ma vale la pena vederli prima:
--
--      select l.piattaforma, l.intestatario, count(*)
--      from public.links l
--      where lower(btrim(coalesce(l.intestatario,''))) not in (
--        select lower(btrim(ricevente)) from public.bonuses
--        where btrim(coalesce(ricevente,'')) <> ''
--      )
--      group by 1,2 order by 1,2;

-- C) Riguarda i 4 totali di overview del Bilancio (Netto totale, In arrivo,
--    Da completare, incl. il nuovo terzo valore per-ricevente aggiunto in
--    questo task) PRIMA di eseguire l'update sotto, e di nuovo DOPO: nessuno
--    dei quattro deve cambiare — l'update è un soft-delete che non tocca
--    bonuses/links, quindi non dovrebbe, ma verificalo comunque a occhio.

-- ----------------------------------------------------------------------------
-- Soft-delete: nasconde i riceventi legacy da tutte le liste (New Bonus,
-- Aggiungi-link, Bilancio) senza cancellare nulla. links/bonuses restano
-- invariati con il loro recipient_id/ricevente intatto.
-- ----------------------------------------------------------------------------
update public.recipients
set is_active = false
where lower(btrim(name)) in (
  'extra3', 'extra4', 'extra5', 'extra6', 'extra7',
  'poma', 'cusi', 'ludovica', 'mattia russo'
)
and is_active = true;

-- Rollback (da eseguire a mano se un nome è stato disattivato per errore):
-- update public.recipients
-- set is_active = true
-- where lower(btrim(name)) in (
--   'extra3', 'extra4', 'extra5', 'extra6', 'extra7',
--   'poma', 'cusi', 'ludovica', 'mattia russo'
-- );

-- ----------------------------------------------------------------------------
-- Verifica finale
-- ----------------------------------------------------------------------------

-- Deve restituire i nomi effettivamente disattivati (≤ 9 — meno se qualche
-- nome non era mai stato backfillato in recipients).
select name from public.recipients
where lower(btrim(name)) in (
  'extra3', 'extra4', 'extra5', 'extra6', 'extra7',
  'poma', 'cusi', 'ludovica', 'mattia russo'
)
and is_active = false
order by name;

-- Conferma che nessun link/bonus di questi nomi è stato toccato (i conteggi
-- devono combaciare con la query A eseguita prima dell'update).
select r.name, count(l.id) as link_count
from public.recipients r
left join public.links l on l.recipient_id = r.id
where lower(btrim(r.name)) in (
  'extra3', 'extra4', 'extra5', 'extra6', 'extra7',
  'poma', 'cusi', 'ludovica', 'mattia russo'
)
group by r.name order by r.name;
