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

create index if not exists bonuses_ricevente_idx   on public.bonuses (ricevente);
create index if not exists bonuses_piattaforma_idx on public.bonuses (piattaforma);
create index if not exists bonuses_persona_idx     on public.bonuses (persona_invitata);
create index if not exists affpay_affiliato_idx    on public.affiliate_payments (affiliato);
