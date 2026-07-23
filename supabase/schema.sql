-- Schema Supabase per APP-PAYOFF
-- Esegui in Supabase Studio → SQL Editor, oppure via lo script di migrazione.

create table if not exists public.bonuses (
  id               bigint generated always as identity primary key,
  piattaforma      text    not null default '',
  persona_invitata text    not null default '',
  stato            text    not null default '',
  ricevente        text    not null default '',
  data             text    not null default '',
  info             text    not null default '',
  affiliati        text    not null default '',
  bonus            numeric not null default 0,
  spese            numeric not null default 0,
  amazon           numeric not null default 0,
  netto            numeric generated always as (bonus - spese - amazon) stored,
  ritirato         boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.affiliate_payments (
  id          bigint generated always as identity primary key,
  affiliato   text    not null default '',
  importo     numeric not null default 0,
  data        text    not null default '',
  modalita    text    not null default '',
  note        text    not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.affiliates (
  id          bigint generated always as identity primary key,
  nome        text    not null unique,
  percentuale numeric not null default 0.20,
  created_at  timestamptz not null default now()
);

-- Migrazione per database già esistenti senza la colonna percentuale:
-- alter table public.affiliates add column if not exists percentuale numeric not null default 0.20;
-- update public.affiliates set percentuale = 0.25 where nome = 'PEPI';

create table if not exists public.promemoria (
  id               uuid        primary key default gen_random_uuid(),
  bonus_id         bigint      references public.bonuses (id) on delete set null,
  lead_id          bigint      references public.leads (id) on delete set null,
  data_promemoria  date        not null,
  descrizione      text        not null default '',
  completato       boolean     not null default false,
  created_at       timestamptz not null default now()
);

-- Migrazione per database già esistenti (tabella promemoria creata prima del collegamento ai lead):
-- alter table public.promemoria add column if not exists lead_id bigint references public.leads (id) on delete set null;

create index if not exists bonuses_ricevente_idx   on public.bonuses (ricevente);
create index if not exists bonuses_piattaforma_idx on public.bonuses (piattaforma);
create index if not exists bonuses_persona_idx     on public.bonuses (persona_invitata);
create index if not exists affpay_affiliato_idx    on public.affiliate_payments (affiliato);
create index if not exists promemoria_data_idx      on public.promemoria (data_promemoria);
create index if not exists promemoria_bonus_idx     on public.promemoria (bonus_id);
create index if not exists promemoria_lead_idx      on public.promemoria (lead_id);


-- ============================================================================
-- Migrazione: riceventi condivisi (Link / Nuovo Bonus / Bilancio) — 2026-07-23
-- Idempotente: eseguibile più volte senza effetti collaterali. Nessun DROP,
-- nessun DELETE/TRUNCATE distruttivo. Sicura da eseguire in Supabase Studio.
--
-- Le tabelle sotto (links, custom_platforms, receiver_link_meta) esistevano
-- già in produzione ma non erano mai state tracciate in questo file: i
-- `create table if not exists` sono no-op lì, servono solo a documentarle e a
-- coprire un ambiente nuovo/di test partito da zero.
-- ============================================================================

create table if not exists public.links (
  id           bigint generated always as identity primary key,
  piattaforma  text not null default '',
  intestatario text not null default '',
  url          text,
  created_at   timestamptz not null default now()
);

create table if not exists public.custom_platforms (
  id             bigint generated always as identity primary key,
  key            text not null,
  label          text not null,
  short          text not null default '',
  color          text not null default '',
  bonus_default  numeric not null default 0,
  spese_default  numeric not null default 0,
  amazon_default numeric not null default 0,
  created_at     timestamptz not null default now()
);
create unique index if not exists custom_platforms_key_idx on public.custom_platforms (key);

create table if not exists public.receiver_link_meta (
  id              bigint generated always as identity primary key,
  piattaforma     text not null default '',
  ricevente       text not null default '',
  maxed           boolean not null default false,
  soldi_ritirati  numeric not null default 0,
  created_at      timestamptz not null default now()
);

-- 1) Tabella condivisa dei riceventi: unica fonte di verità per Link / Nuovo
--    Bonus / Bilancio. Dedup su lower(btrim(name)) — "Diego" e "diego " sono
--    la stessa persona.
create table if not exists public.recipients (
  id         bigint generated always as identity primary key,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists recipients_name_key on public.recipients (lower(btrim(name)));

-- 2) FK opzionale su links, colonna legacy `intestatario` non toccata (resta
--    in sync ad ogni scrittura). url diventa opzionale (Requisito 2).
alter table public.links add column if not exists recipient_id bigint
  references public.recipients(id) on delete set null;
alter table public.links alter column url drop not null;

-- 3) Backfill in DUE passaggi separati e ordinati — NON accorpare in un unico
--    statement/UNION: senza un ORDER BY esplicito sull'INSERT, Postgres non
--    garantisce l'ordine di assegnazione degli id, e l'ordine delle card di
--    Bilancio (che ordina i riceventi per id) verrebbe rimescolato a caso.
--
--    Passaggio 1: lista storica, nell'ordine esatto di oggi (fissa gli id
--    1..14 nello stesso ordine con cui compaiono oggi in Bilancio/dropdown).
insert into public.recipients (name)
select n from unnest(array['Lori','Diego','poma','Cusi','Ludovica','Rubi',
  'MATTIA RUSSO','Luca pietra','Alessia longo','Extra3','Extra4','Extra5',
  'Extra6','Extra7']) with ordinality as t(n, ord)
order by ord
on conflict do nothing;

--    Passaggio 2: tutti gli altri nomi trovati in bonuses/links, con grafia
--    canonica deterministica (bonuses vince su links in caso di collisione
--    case/spazi, essendo la fonte dei numeri di Bilancio).
insert into public.recipients (name)
select distinct on (lower(btrim(x))) btrim(x)
from (
  select ricevente    as x, 1 as prio from public.bonuses where btrim(coalesce(ricevente,''))    <> ''
  union all
  select intestatario as x, 2 as prio from public.links   where btrim(coalesce(intestatario,'')) <> ''
) s
order by lower(btrim(x)), prio
on conflict do nothing;

-- 4) Collega i link esistenti al ricevente corrispondente.
update public.links l
set recipient_id = r.id
from public.recipients r
where l.recipient_id is null
  and lower(btrim(l.intestatario)) = lower(btrim(r.name));

-- ============================================================================
-- DA ESEGUIRE MANUALMENTE PRIMA della migrazione sopra, per rivedere l'impatto
-- (non fanno parte dello script idempotente, sono query di sola lettura):
--
-- A) Collisioni di grafia tra la lista storica e nomi già presenti in bonuses
--    con casing/spazi diversi — se torna righe, decidere caso per caso quale
--    grafia deve "vincere" prima di lanciare il backfill:
--
--      select ricevente, count(*) from public.bonuses b
--      where lower(btrim(ricevente)) in (select lower(btrim(name)) from public.recipients)
--        and btrim(ricevente) not in (select name from public.recipients)
--      group by 1;
--
-- B) Rischio "card fantasma" in Bilancio: oggi receiverList = lista storica +
--    nomi scrapati da links.intestatario — bonuses.ricevente NON contribuisce.
--    Dopo il backfill sì: qualsiasi nome presente SOLO in bonuses.ricevente
--    (inclusi vecchi refusi) diventerà una card nuova in Bilancio. Va
--    controllata questa lista prima di lanciare la migrazione in produzione:
--
--      select distinct btrim(ricevente) from public.bonuses
--      where btrim(coalesce(ricevente,'')) <> ''
--        and lower(btrim(ricevente)) not in (
--          select lower(btrim(intestatario)) from public.links where btrim(coalesce(intestatario,'')) <> ''
--        );
-- ============================================================================

-- 5) Verifica finale (entrambe devono restituire 0 righe):
select count(*) from public.links
where btrim(coalesce(intestatario,'')) <> '' and recipient_id is null;

select ricevente, count(*) from public.bonuses
where btrim(coalesce(ricevente,'')) <> ''
  and lower(btrim(ricevente)) not in (select lower(btrim(name)) from public.recipients)
group by 1;

create index if not exists links_recipient_idx on public.links (recipient_id);
