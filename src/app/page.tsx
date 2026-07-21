"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AFFILIATES, RECEIVERS, STATUSES } from "@/config/dropdowns";
import { STATIC_PLATFORMS, buildPlatformColorMap, type PlatformConfig } from "@/config/platforms";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { todayISO } from "@/lib/date";
import ReminderBellButton from "@/components/ReminderBellButton";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Gift,
  LogOut,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";

const STATUS_DOT_COLORS: Record<string, string> = {
  "Bonus arrivato": "#16A34A",
  "Bonus in arrivo": "#D97706",
  "Registrato da completare": "#7C3AED",
  FAIL: "#DC2626",
};
import type { BonusRecord, NewBonusPayload } from "@/lib/types";

type DeleteConfirm = {
  id: number;
  nome: string;
  piattaforma: string;
};

type BonusFormState = Omit<NewBonusPayload, "bonus" | "spese" | "amazon"> & {
  bonus: string;
  spese: string;
  amazon: string;
};

type SortMode = "alpha-asc" | "alpha-desc" | "date-asc" | "date-desc" | null;

const defaultForm: BonusFormState = {
  piattaforma: STATIC_PLATFORMS[0].key,
  personaInvitata: "",
  stato: STATUSES[0],
  ricevente: "",
  data: "",
  info: "",
  affiliati: "",
  bonus: "",
  spese: "",
  amazon: "",
};

export default function HomePage() {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rows, setRows] = useState<BonusRecord[]>([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BonusFormState>(defaultForm);
  const [loadingRead, setLoadingRead] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [infoDrafts, setInfoDrafts] = useState<Record<number, string>>({});
  const [infoSavedRow, setInfoSavedRow] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addReminder, setAddReminder] = useState(false);
  const [reminderData, setReminderData] = useState(todayISO());
  const [reminderDescrizione, setReminderDescrizione] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(null);
  const [affiliatiRoster, setAffiliatiRoster] = useState<string[]>([...AFFILIATES]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(STATIC_PLATFORMS);

  const bonusValue = Number(form.bonus || 0);
  const speseValue = Number(form.spese || 0);
  const amazonValue = Number(form.amazon || 0);
  const nettoForm = bonusValue - speseValue - amazonValue;

  const platformColorMap = useMemo(() => buildPlatformColorMap(platforms), [platforms]);
  function platformBadgeColor(name: string) {
    return platformColorMap[name] ?? "#2D7DD2";
  }
  const platformBorderColor = platformBadgeColor;

  async function fetchRows() {
    setLoadingRead(true);
    setError("");
    try {
      const res = await fetch("/api/sheets/read", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore lettura dati.");
      const nextRows: BonusRecord[] = data.rows ?? [];
      setRows(nextRows);
      setInfoDrafts(
        nextRows.reduce<Record<number, string>>((acc, row) => {
          acc[row.id] = row.info ?? "";
          return acc;
        }, {}),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoadingRead(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/affiliati/read", { cache: "no-store" });
        const data = (await res.json()) as { roster?: string[] };
        if (res.ok && data.roster?.length) setAffiliatiRoster(data.roster);
      } catch {
        // mantiene il fallback AFFILIATES
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/platforms/read", { cache: "no-store" });
        const data = (await res.json()) as { platforms?: PlatformConfig[] };
        if (res.ok && data.platforms?.length) {
          setPlatforms(data.platforms);
          setForm((prev) =>
            data.platforms!.some((p) => p.key === prev.piattaforma)
              ? prev
              : { ...prev, piattaforma: data.platforms![0].key },
          );
        }
      } catch {
        // mantiene il fallback STATIC_PLATFORMS
      }
    })();
  }, []);

  useEffect(() => {
    if (!deleteToast) return;
    const id = window.setTimeout(() => setDeleteToast(false), 2000);
    return () => window.clearTimeout(id);
  }, [deleteToast]);

  const filtersActive =
    platformFilter !== null || statusFilter !== null || sortMode !== null;

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term && !filtersActive) return [];

    let result = rows;
    if (term) {
      result = result.filter((row) =>
        row.personaInvitata.toLowerCase().includes(term),
      );
    }
    if (platformFilter) {
      result = result.filter((row) => row.piattaforma === platformFilter);
    }
    if (statusFilter) {
      result = result.filter((row) => row.stato === statusFilter);
    }

    if (sortMode) {
      result = [...result];
      if (sortMode === "alpha-asc" || sortMode === "alpha-desc") {
        result.sort((a, b) =>
          a.personaInvitata.localeCompare(b.personaInvitata, "it", {
            sensitivity: "base",
          }),
        );
        if (sortMode === "alpha-desc") result.reverse();
      } else {
        // id crescente = ordine di inserimento nell'app
        result.sort((a, b) => a.id - b.id);
        if (sortMode === "date-desc") result.reverse();
      }
    }

    return result;
  }, [rows, query, filtersActive, platformFilter, statusFilter, sortMode]);

  const people = useMemo(() => {
    const map = new Map<
      string,
      { nome: string; rows: BonusRecord[]; totalNetto: number; statuses: Set<string> }
    >();
    for (const row of filteredRows) {
      const nome = row.personaInvitata.trim() || "(senza nome)";
      const key = nome.toLowerCase();
      const entry = map.get(key) ?? {
        nome,
        rows: [],
        totalNetto: 0,
        statuses: new Set<string>(),
      };
      entry.rows.push(row);
      entry.totalNetto += row.netto;
      if (row.stato) entry.statuses.add(row.stato);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
    );
  }, [filteredRows]);

  async function handleSaveBonus() {
    if (addReminder && !reminderDescrizione.trim()) {
      setError("Inserisci una descrizione per il promemoria, o disattiva il toggle.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/sheets/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bonus: Number(form.bonus || 0),
          spese: Number(form.spese || 0),
          amazon: Number(form.amazon || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossibile salvare il bonus.");

      if (addReminder && data.row) {
        const reminderRes = await fetch("/api/promemoria/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bonusId: data.row.id,
            leadId: null,
            dataPromemoria: reminderData,
            descrizione: reminderDescrizione.trim(),
          }),
        });
        if (!reminderRes.ok) {
          const reminderPayload = await reminderRes.json();
          throw new Error(
            `Bonus salvato, ma il promemoria non è stato creato: ${reminderPayload.error ?? "errore sconosciuto"}.`,
          );
        }
      }

      setSuccess("Bonus salvato con successo.");
      setForm(defaultForm);
      setAddReminder(false);
      setReminderData(todayISO());
      setReminderDescrizione("");
      setShowModal(false);
      await fetchRows();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineUpdate(
    row: BonusRecord,
    field:
      | "stato"
      | "ricevente"
      | "affiliati"
      | "bonus"
      | "spese"
      | "amazon"
      | "info",
    value: string | number,
  ): Promise<boolean> {
    const key = `${row.id}-${field}`;
    setUpdatingKey(key);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/sheets/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          field,
          value:
            field === "bonus" || field === "spese" || field === "amazon"
              ? Number(value) || 0
              : String(value),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aggiornamento non riuscito.");

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                [field]:
                  field === "bonus" || field === "spese" || field === "amazon"
                    ? Number(value) || 0
                    : value,
              }
            : item,
        ),
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
      return false;
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleInfoSave(row: BonusRecord) {
    const nextInfo = (infoDrafts[row.id] ?? "").trim();
    if (nextInfo === row.info.trim()) return;

    const ok = await handleInlineUpdate(row, "info", nextInfo);
    if (!ok) return;

    setInfoSavedRow(row.id);
    setTimeout(() => {
      setInfoSavedRow((current) => (current === row.id ? null : current));
    }, 1500);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const deletedRn = deleteConfirm.id;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/sheets/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Eliminazione non riuscita.");

      setDeleteConfirm(null);
      setRows((prev) => prev.filter((r) => r.id !== deletedRn));
      setInfoDrafts((prev) => {
        const next: Record<number, string> = {};
        for (const [keyStr, val] of Object.entries(prev)) {
          const k = Number(keyStr);
          if (k === deletedRn) continue;
          next[k] = val;
        }
        return next;
      });
      setInfoSavedRow((current) => (current === deletedRn ? null : current));
      setDeleteToast(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-5">
        <header className="relative flex items-start justify-between gap-3 pt-1">
          <div>
            <Image
              src="/logo.png"
              alt="PayOff logo"
              width={104}
              height={42}
              priority
              className="mb-5 w-[100px] [filter:brightness(0)_invert(1)]"
            />
            <p className="page-eyebrow">Ciao 👋</p>
            <h1 className="page-title mt-1">I tuoi bonus</h1>
          </div>
          <div className="shrink-0 pt-1">
            <button
              type="button"
              aria-label="Profilo"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/80 transition-colors hover:bg-white/10"
            >
              <User className="h-5 w-5" />
            </button>
            {showProfileMenu ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  role="presentation"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0F1420] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4" /> Esci dall&apos;account
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <section className="surface-card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#2D5BE3]/25 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#2D5BE3]/15 text-[#7ea0ff]">
              <Plus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-white">Registra Nuovo Bonus</h2>
              <p className="mt-0.5 text-[13px] text-white/50">Aggiungi una nuova riga al foglio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm);
              setAddReminder(false);
              setReminderData(todayISO());
              setReminderDescrizione("");
              setShowModal(true);
            }}
            className="btn-primary relative mt-4 w-full"
          >
            <Plus className="h-5 w-5" /> Nuovo bonus
          </button>
        </section>

        <section className="surface-card relative z-40 p-5">
          <h2 className="mb-3 text-[17px] font-bold text-white">Cerca persona</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca persona..."
              className="field-input min-h-14 pl-12 text-base"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-start gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowStatusMenu(false);
                  setShowPlatformMenu((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  platformFilter
                    ? "border-[#2D5BE3] bg-[#2D5BE3] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
                }`}
              >
                <Gift className="h-3.5 w-3.5" /> {platformFilter ?? "Bonus"}{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showPlatformMenu ? (
                <div className="absolute left-0 top-full z-30 mt-2 max-h-60 w-48 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] rounded-2xl border border-white/10 bg-[#0F1420] pt-1 pb-24 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformFilter(null);
                      setShowPlatformMenu(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-[14px] font-bold text-white hover:bg-white/10 ${
                      platformFilter === null ? "bg-white/10" : ""
                    }`}
                  >
                    Tutti i bonus
                  </button>
                  {platforms.map((platform) => (
                    <button
                      key={platform.key}
                      type="button"
                      onClick={() => {
                        setPlatformFilter(platform.key);
                        setShowPlatformMenu(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] font-bold text-white hover:bg-white/10 ${
                        platformFilter === platform.key ? "bg-white/10" : ""
                      }`}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      {platform.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPlatformMenu(false);
                  setShowStatusMenu((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  statusFilter
                    ? "border-[#2D5BE3] bg-[#2D5BE3] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
                }`}
              >
                <Tag className="h-3.5 w-3.5" /> {statusFilter ?? "Stato"}{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showStatusMenu ? (
                <div className="absolute left-0 top-full z-30 mt-2 max-h-60 w-60 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] rounded-2xl border border-white/10 bg-[#0F1420] pt-1 pb-24 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(null);
                      setShowStatusMenu(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-[14px] font-bold text-white hover:bg-white/10 ${
                      statusFilter === null ? "bg-white/10" : ""
                    }`}
                  >
                    Tutti gli stati
                  </button>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusMenu(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] font-bold text-white hover:bg-white/10 ${
                        statusFilter === status ? "bg-white/10" : ""
                      }`}
                    >
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: STATUS_DOT_COLORS[status] ?? "#ffffff",
                        }}
                      />
                      {status}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPlatformMenu(false);
                setShowStatusMenu(false);
                setSortMode((prev) =>
                  prev === "date-asc"
                    ? "date-desc"
                    : prev === "date-desc"
                      ? null
                      : "date-asc",
                );
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors ${
                sortMode === "date-asc" || sortMode === "date-desc"
                  ? "border-[#2D5BE3] bg-[#2D5BE3] text-white"
                  : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" /> {sortMode === "date-desc" ? "Recenti" : "Vecchie"}
            </button>

            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setPlatformFilter(null);
                  setStatusFilter(null);
                  setSortMode(null);
                  setShowPlatformMenu(false);
                  setShowStatusMenu(false);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-3.5 py-2 text-[13px] font-bold text-white/60 hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" /> Azzera filtri
              </button>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-[#2D5BE3]/25 bg-[#2D5BE3]/10 p-4 text-[#9db6ff]">
            {success}
          </div>
        ) : null}

        {query.trim().length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-base font-semibold uppercase tracking-wide text-white/60">
              Persone ({people.length})
            </h2>

            {loadingRead ? (
              <div className="surface-card p-6 text-base text-white/70">
                Caricamento righe in corso...
              </div>
            ) : people.length === 0 ? (
              <div className="surface-card p-6 text-base text-white/70">
                Nessun risultato
              </div>
            ) : (
              <ul className="space-y-3">
                {people.map((person, index) => (
                  <li
                    key={person.nome}
                    className="animate-[fadeSlide_0.4s_ease_both]"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <Link
                      href={`/persona/${encodeURIComponent(person.nome)}`}
                      className="group flex items-center gap-4 surface-card p-4 transition-transform duration-200 active:scale-[0.98] hover:border-white/40 hover:bg-white/15"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-base font-bold uppercase text-white">
                        {person.nome.slice(0, 2)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold leading-tight">
                          {person.nome}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-white/55">
                            {person.rows.length} bonus
                          </span>
                          <span className="flex items-center gap-1">
                            {[...person.statuses].map((stato) => (
                              <span
                                key={stato}
                                title={stato}
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: STATUS_DOT_COLORS[stato] ?? "#ffffff" }}
                              />
                            ))}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold leading-none tabular-nums">
                          {person.totalNetto.toFixed(2)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/50">netto $</p>
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {!query.trim() && filtersActive ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Risultati ({filteredRows.length})
            </h2>

            {loadingRead ? (
              <div className="surface-card p-6 text-base text-white/70">
                Caricamento righe in corso...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="surface-card p-6 text-base text-white/70">
                Nessun risultato
              </div>
            ) : (
              filteredRows.map((row) => (
                <article
                  key={row.id}
                  className="relative surface-card p-5 pt-12 text-white"
                  style={{
                    borderLeft: `4px solid ${platformBorderColor(row.piattaforma)}`,
                  }}
                >
                  <div className="absolute left-4 top-4 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Elimina bonus"
                      className="grid h-8 w-8 place-items-center rounded-full text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      onClick={() =>
                        setDeleteConfirm({
                          id: row.id,
                          nome: row.personaInvitata || "",
                          piattaforma: row.piattaforma || "",
                        })
                      }
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                    <ReminderBellButton
                      link={{ type: "bonus", id: row.id }}
                      label={`${row.piattaforma || "Bonus"} · ${row.personaInvitata || "(senza nome)"}`}
                      iconStyle="emoji"
                    />
                  </div>

                  <div className="mb-5 flex items-start justify-between gap-3">
                    <h3 className="text-[24px] leading-tight font-bold text-white">
                      {row.personaInvitata || "(senza nome)"}
                    </h3>
                    <p className="text-[32px] leading-none font-bold text-white">
                      {row.netto.toFixed(2)}
                    </p>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span
                      className="ml-auto rounded-full px-3 py-1.5 text-[14px] font-bold text-white"
                      style={{ backgroundColor: platformBadgeColor(row.piattaforma) }}
                    >
                      {row.piattaforma || "PIATTAFORMA"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-base md:grid-cols-2">
                    <div>
                      <p className="text-[12px] font-bold text-white/70">Data</p>
                      <p className="text-[16px] font-black text-white">{row.data || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white/70">Netto $</p>
                      <p className="text-[16px] font-black text-white">
                        {row.netto.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="field-label">STATO</span>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: STATUS_DOT_COLORS[row.stato] ?? "#ffffff" }}
                      />
                      <select
                        value={row.stato}
                        onChange={(event) =>
                          void handleInlineUpdate(row, "stato", event.target.value)
                        }
                        disabled={updatingKey === `${row.id}-stato`}
                        className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-9 text-[15px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status} className="bg-[#0F1420] text-white">
                            {status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    </div>
                  </label>

                  <label className="space-y-1">
                    <span className="field-label">Ricevente</span>
                    <select
                      value={row.ricevente}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "ricevente", event.target.value)
                      }
                      disabled={updatingKey === `${row.id}-ricevente`}
                      className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    >
                      <option value="" className="bg-[#0F1420] text-white">-</option>
                      {RECEIVERS.map((option) => (
                        <option key={option} value={option} className="bg-[#0F1420] text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="field-label">AFFILIATI</span>
                    <select
                      value={row.affiliati}
                      onChange={(event) =>
                        void handleInlineUpdate(row, "affiliati", event.target.value)
                      }
                      disabled={updatingKey === `${row.id}-affiliati`}
                      className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    >
                      <option value="" className="bg-[#0F1420] text-white">-</option>
                      {affiliatiRoster.map((option) => (
                        <option key={option} value={option} className="bg-[#0F1420] text-white">
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <span className="field-label">INFO</span>
                      {infoSavedRow === row.id ? (
                        <span className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
                          <Check className="h-4 w-4" /> Salvato
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      value={infoDrafts[row.id] ?? row.info}
                      onChange={(event) =>
                        setInfoDrafts((prev) => ({
                          ...prev,
                          [row.id]: event.target.value,
                        }))
                      }
                      onBlur={() => {
                        void handleInfoSave(row);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      disabled={updatingKey === `${row.id}-info`}
                      rows={2}
                      className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="field-label">Bonus $</span>
                    <input
                      type="number"
                      value={row.bonus}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "bonus",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.id}-bonus`}
                      className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="field-label">Spese</span>
                    <input
                      type="number"
                      value={row.spese}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "spese",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.id}-spese`}
                      className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="field-label">Amazon</span>
                    <input
                      type="number"
                      value={row.amazon}
                      onChange={(event) =>
                        void handleInlineUpdate(
                          row,
                          "amazon",
                          Number(event.target.value || 0),
                        )
                      }
                      disabled={updatingKey === `${row.id}-amazon`}
                      className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                    />
                  </label>
                </div>
              </article>
              ))
            )}
          </section>
        ) : null}
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[#0F1420] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-[22px] sm:border sm:border-white/10 sm:shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <h2 className="mb-4 text-[24px] font-bold text-white">Registra Nuovo Bonus</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Piattaforma *</span>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: platformBadgeColor(form.piattaforma) }}
                  />
                  <select
                    value={form.piattaforma}
                    onChange={(event) => {
                      const piattaforma = event.target.value;
                      const importi = platforms.find((p) => p.key === piattaforma);
                      setForm((prev) => ({
                        ...prev,
                        piattaforma,
                        bonus: importi ? String(importi.bonusDefault) : "",
                        spese: importi ? String(importi.speseDefault) : "",
                        amazon: importi ? String(importi.amazonDefault) : "",
                      }));
                    }}
                    className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] py-[14px] pl-9 pr-10 text-[16px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  >
                    {platforms.map((option) => (
                      <option key={option.key} value={option.key} className="bg-[#0F1420] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                </div>
              </label>

              <label className="space-y-1">
                <span className="field-label">Persona invitata</span>
                <input
                  value={form.personaInvitata}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, personaInvitata: event.target.value }))
                  }
                  className="field-input"
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">STATO *</span>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: STATUS_DOT_COLORS[form.stato] ?? "#ffffff" }}
                  />
                  <select
                    value={form.stato}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, stato: event.target.value }))
                    }
                    className="min-h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-white/[0.06] py-[14px] pl-9 pr-10 text-[16px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  >
                    {STATUSES.map((option) => (
                      <option key={option} value={option} className="bg-[#0F1420] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                </div>
              </label>

              <label className="space-y-1">
                <span className="field-label">Ricevente</span>
                <select
                  value={form.ricevente}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ricevente: event.target.value }))
                  }
                  className="field-input"
                >
                  <option value="">-</option>
                  {RECEIVERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="field-label">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, data: event.target.value }))
                  }
                  className="field-input"
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">AFFILIATI</span>
                <select
                  value={form.affiliati}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, affiliati: event.target.value }))
                  }
                  className="field-input"
                >
                  <option value="">-</option>
                  {affiliatiRoster.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="field-label">INFO</span>
                <textarea
                  value={form.info}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, info: event.target.value }))
                  }
                  className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/50 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  rows={2}
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">Bonus $</span>
                <input
                  type="number"
                  value={form.bonus}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bonus: event.target.value }))
                  }
                  className="field-input"
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">Spese</span>
                <input
                  type="number"
                  value={form.spese}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, spese: event.target.value }))
                  }
                  className="field-input"
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">Amazon</span>
                <input
                  type="number"
                  value={form.amazon}
                  placeholder="0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amazon: event.target.value }))
                  }
                  className="field-input"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setAddReminder((prev) => !prev)}
                  aria-pressed={addReminder}
                  className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-4 py-3 text-[15px] font-semibold transition-colors ${
                    addReminder
                      ? "border-[#2D5BE3]/50 bg-[#2D5BE3]/10 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="text-lg leading-none">🔔</span>
                    <span>Aggiungi promemoria</span>
                  </span>
                  <span
                    className={`flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      addReminder
                        ? "justify-end border-[#2D5BE3]/60 bg-[#2D5BE3]"
                        : "justify-start border-white/10 bg-white/15"
                    }`}
                  >
                    <span className="mx-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform" />
                  </span>
                </button>

                {addReminder ? (
                  <div className="mt-3 animate-[fadeSlide_0.25s_ease_both] space-y-3 rounded-[14px] border border-white/10 bg-white/[0.03] p-4">
                    <label className="block space-y-1">
                      <span className="field-label">
                        Data promemoria
                      </span>
                      <input
                        type="date"
                        value={reminderData}
                        onChange={(event) => setReminderData(event.target.value)}
                        className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-base font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="field-label">
                        Cosa fare
                      </span>
                      <textarea
                        value={reminderDescrizione}
                        onChange={(event) => setReminderDescrizione(event.target.value)}
                        rows={2}
                        placeholder="Es. Controllare se il bonus è arrivato"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <p className="text-2xl font-extrabold text-emerald-300">
                  Netto: ${nettoForm.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveBonus()}
                className="btn-primary w-full sm:w-auto"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteConfirm(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-bonus-title"
            className="w-full max-w-sm rounded-[22px] border border-white/10 bg-[#0F1420] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            <h2
              id="delete-bonus-title"
              className="text-[20px] font-bold text-white"
            >
              Elimina bonus?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/65">
              Sei sicuro di voler eliminare il bonus di{" "}
              <span className="font-semibold">
                {deleteConfirm.nome.trim() || "(senza nome)"}
              </span>{" "}
              su{" "}
              <span className="font-semibold">
                {deleteConfirm.piattaforma.trim() || "—"}
              </span>
              ? Questa azione non può essere annullata.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete();
                }}
                className="min-h-12 rounded-xl bg-[#DC2626] px-5 py-3 text-base font-bold text-white disabled:opacity-60"
              >
                {deleting ? "Eliminazione..." : "Elimina"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(null);
                }}
                className="btn-secondary "
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteToast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white shadow-lg">
          Bonus eliminato ✓
        </div>
      ) : null}

      {showLogoutConfirm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loggingOut) setShowLogoutConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm rounded-[22px] border border-white/10 bg-[#0F1420] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            <h2 id="logout-confirm-title" className="text-[20px] font-bold text-white">
              Sei sicuro di voler uscire?
            </h2>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                disabled={loggingOut}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleLogout();
                }}
                className="min-h-12 rounded-xl bg-[#DC2626] px-5 py-3 text-base font-bold text-white disabled:opacity-60"
              >
                {loggingOut ? "Uscita..." : "Esci"}
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutConfirm(false);
                }}
                className="btn-secondary "
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
