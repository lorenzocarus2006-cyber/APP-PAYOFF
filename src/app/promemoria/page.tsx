"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  STATIC_PLATFORMS,
  buildPlatformColorMap,
  mergePlatforms,
  type PlatformConfig,
} from "@/config/platforms";
import {
  addDaysISO,
  formatCalendarDayHeader,
  formatItalianDate,
  todayISO,
} from "@/lib/date";
import type { BonusRecord, Lead, Reminder } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Bonus arrivato": "#16A34A",
  "Bonus in arrivo": "#D97706",
  "Registrato da completare": "#7C3AED",
  FAIL: "#DC2626",
};

const RETENTION_DAYS = 60;

type LinkMode = "none" | "bonus" | "lead";

type ReminderFormState = {
  data: string;
  descrizione: string;
  linkMode: LinkMode;
  bonusQuery: string;
  selectedBonus: BonusRecord | null;
  leadQuery: string;
  selectedLead: Lead | null;
};

function emptyForm(): ReminderFormState {
  return {
    data: todayISO(),
    descrizione: "",
    linkMode: "none",
    bonusQuery: "",
    selectedBonus: null,
    leadQuery: "",
    selectedLead: null,
  };
}

type CalendarEntry =
  | { kind: "day"; date: string; items: Reminder[] }
  | { kind: "gap"; from: string; to: string };

function groupByDate(list: Reminder[]): Map<string, Reminder[]> {
  const map = new Map<string, Reminder[]>();
  for (const r of list) {
    const arr = map.get(r.dataPromemoria) ?? [];
    arr.push(r);
    map.set(r.dataPromemoria, arr);
  }
  return map;
}

/** Cammina giorno per giorno da oggi in avanti: oggi è sempre mostrato, i giorni vuoti in mezzo si accorpano in un divisore compatto. */
function buildForwardCalendar(byDate: Map<string, Reminder[]>, today: string, endDate: string): CalendarEntry[] {
  const entries: CalendarEntry[] = [{ kind: "day", date: today, items: byDate.get(today) ?? [] }];
  if (endDate <= today) return entries;

  let cursor = addDaysISO(today, 1);
  let gapStart: string | null = null;
  let guard = 0;
  while (cursor <= endDate && guard < 400) {
    guard++;
    const items = byDate.get(cursor);
    if (items && items.length) {
      if (gapStart) {
        entries.push({ kind: "gap", from: gapStart, to: addDaysISO(cursor, -1) });
        gapStart = null;
      }
      entries.push({ kind: "day", date: cursor, items });
    } else if (!gapStart) {
      gapStart = cursor;
    }
    cursor = addDaysISO(cursor, 1);
  }
  return entries;
}

/** Solo i giorni popolati, più recente per primo (per "Giorni precedenti" e "Promemoria completati"). */
function buildDescendingDays(byDate: Map<string, Reminder[]>): CalendarEntry[] {
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ kind: "day" as const, date, items }));
}

function formatGapLabel(from: string, to: string): string {
  const fromDay = Number(from.slice(8, 10));
  const toDay = Number(to.slice(8, 10));
  if (from === to) return `${fromDay} · nessun promemoria`;
  return `${fromDay}–${toDay} · nessun promemoria`;
}

function ReminderCard({
  reminder,
  platformColor,
  onOpen,
}: {
  reminder: Reminder;
  platformColor: (name: string) => string;
  onOpen: (reminder: Reminder) => void;
}) {
  const borderColor = reminder.bonus
    ? platformColor(reminder.bonus.piattaforma)
    : reminder.lead
      ? "#2D5BE3"
      : "rgba(255,255,255,0.15)";
  return (
    <button
      type="button"
      onClick={() => onOpen(reminder)}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors hover:bg-white/[0.07]"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-white/45">{formatItalianDate(reminder.dataPromemoria)}</p>
          {reminder.completato ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <Check className="h-2.5 w-2.5" /> FATTO
            </span>
          ) : null}
        </div>
        <p
          className={`mt-0.5 truncate text-sm font-semibold ${reminder.completato ? "text-white/40 line-through" : "text-white"}`}
        >
          {reminder.descrizione || "(senza descrizione)"}
        </p>
        {reminder.bonus ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: platformColor(reminder.bonus.piattaforma) }}
            >
              {reminder.bonus.piattaforma}
            </span>
            <span className="truncate text-[11px] text-white/50">
              {reminder.bonus.personaInvitata || "-"}
            </span>
          </div>
        ) : reminder.lead ? (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-[#2D5BE3]/20 px-2 py-0.5 text-[10px] font-bold text-[#7ea0ff]">
              <Target className="h-2.5 w-2.5" /> LEAD
            </span>
            <span className="truncate text-[11px] text-white/50">{reminder.lead.nome || "-"}</span>
          </div>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
    </button>
  );
}

function CalendarSection({
  entries,
  today,
  platformColor,
  onOpen,
}: {
  entries: CalendarEntry[];
  today: string;
  platformColor: (name: string) => string;
  onOpen: (reminder: Reminder) => void;
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry) =>
        entry.kind === "day" ? (
          <section key={entry.date} className="space-y-2">
            <h2 className="flex items-baseline gap-2 text-[13px] font-bold tracking-wide text-white/50">
              {formatCalendarDayHeader(entry.date)}
              {entry.date === today ? (
                <span className="rounded-full bg-[#2D5BE3]/25 px-2 py-0.5 text-[10px] font-bold tracking-normal text-[#7ea0ff]">
                  OGGI
                </span>
              ) : null}
            </h2>
            {entry.items.length === 0 ? (
              <p className="pl-0.5 text-xs text-white/30">Nessun promemoria</p>
            ) : (
              <div className="space-y-2">
                {entry.items.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} platformColor={platformColor} onOpen={onOpen} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <div key={`gap-${entry.from}`} className="flex items-center gap-3 py-1 pl-0.5">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="shrink-0 text-[11px] text-white/25">{formatGapLabel(entry.from, entry.to)}</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
        ),
      )}
    </div>
  );
}

type LinkPickerProps = {
  form: ReminderFormState;
  onFormChange: (updater: (prev: ReminderFormState) => ReminderFormState) => void;
  bonusMatches: BonusRecord[];
  leadMatches: Lead[];
  platformColor: (name: string) => string;
};

function LinkPicker({ form, onFormChange, bonusMatches, leadMatches, platformColor }: LinkPickerProps) {
  return (
    <div className="space-y-2">
      <span className="text-[13px] font-bold text-white">Collega a (opzionale)</span>
      <div className="flex gap-2">
        {(["none", "bonus", "lead"] as LinkMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onFormChange((prev) => ({ ...prev, linkMode: mode }))}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
              form.linkMode === mode
                ? "border-[#2D5BE3] bg-[#2D5BE3] text-white"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10"
            }`}
          >
            {mode === "none" ? "Nessuno" : mode === "bonus" ? "Bonus" : "Lead"}
          </button>
        ))}
      </div>

      {form.linkMode === "bonus" ? (
        form.selectedBonus ? (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: platformColor(form.selectedBonus.piattaforma) }}
              >
                {form.selectedBonus.piattaforma}
              </span>
              <span className="text-sm font-semibold text-white">
                {form.selectedBonus.personaInvitata || "(senza nome)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onFormChange((prev) => ({ ...prev, selectedBonus: null }))}
              className="text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={form.bonusQuery}
              onChange={(event) => onFormChange((prev) => ({ ...prev, bonusQuery: event.target.value }))}
              placeholder="Cerca persona, piattaforma o ricevente..."
              className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10"
            />
            {bonusMatches.length > 0 ? (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-[14px] border border-white/10 bg-[#11141C] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                {bonusMatches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, selectedBonus: b, bonusQuery: "" }))}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10"
                  >
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: platformColor(b.piattaforma) }}
                    >
                      {b.piattaforma}
                    </span>
                    <span className="truncate text-sm font-semibold text-white">
                      {b.personaInvitata || "(senza nome)"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {form.linkMode === "lead" ? (
        form.selectedLead ? (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[#2D5BE3]/20 px-2 py-0.5 text-[11px] font-bold text-[#7ea0ff]">
                <Target className="h-3 w-3" /> LEAD
              </span>
              <span className="text-sm font-semibold text-white">{form.selectedLead.nome}</span>
            </div>
            <button
              type="button"
              onClick={() => onFormChange((prev) => ({ ...prev, selectedLead: null }))}
              className="text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={form.leadQuery}
              onChange={(event) => onFormChange((prev) => ({ ...prev, leadQuery: event.target.value }))}
              placeholder="Cerca lead per nome..."
              className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10"
            />
            {leadMatches.length > 0 ? (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-[14px] border border-white/10 bg-[#11141C] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                {leadMatches.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onFormChange((prev) => ({ ...prev, selectedLead: l, leadQuery: "" }))}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10"
                  >
                    <span className="truncate text-sm font-semibold text-white">{l.nome}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

export default function PromemoriaPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bonuses, setBonuses] = useState<BonusRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(STATIC_PLATFORMS);
  const [showPast, setShowPast] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ReminderFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [detail, setDetail] = useState<Reminder | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState("");
  const [editDescrizione, setEditDescrizione] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const platformColorMap = useMemo(() => buildPlatformColorMap(platforms), [platforms]);
  function platformColor(name: string) {
    return platformColorMap[name] ?? "#2D7DD2";
  }

  async function fetchReminders() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/promemoria/read", { cache: "no-store" });
      const data = (await res.json()) as { reminders?: Reminder[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore caricamento promemoria.");
      setReminders(data.reminders ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => void fetchReminders(), 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sheets/read", { cache: "no-store" });
        const data = (await res.json()) as { rows?: BonusRecord[] };
        if (res.ok) setBonuses(data.rows ?? []);
      } catch {
        // lista bonus resta vuota, il promemoria si può comunque creare standalone
      }
    })();
    void (async () => {
      try {
        const res = await fetch("/api/leads/read", { cache: "no-store" });
        const data = (await res.json()) as { leads?: Lead[] };
        if (res.ok) setLeads(data.leads ?? []);
      } catch {
        // lista lead resta vuota
      }
    })();
    void (async () => {
      try {
        const res = await fetch("/api/platforms/read", { cache: "no-store" });
        const data = (await res.json()) as { platforms?: PlatformConfig[] };
        if (res.ok && data.platforms?.length) setPlatforms(mergePlatforms(data.platforms));
      } catch {
        // mantiene il fallback STATIC_PLATFORMS
      }
    })();
  }, []);

  const today = todayISO();

  const activeReminders = useMemo(() => reminders.filter((r) => !r.completato), [reminders]);
  const completedReminders = useMemo(() => reminders.filter((r) => r.completato), [reminders]);

  const futureActive = useMemo(
    () => activeReminders.filter((r) => r.dataPromemoria >= today),
    [activeReminders, today],
  );
  const pastActive = useMemo(
    () => activeReminders.filter((r) => r.dataPromemoria < today),
    [activeReminders, today],
  );

  const forwardCalendar = useMemo(() => {
    const byDate = groupByDate(futureActive);
    const maxDate = futureActive.length
      ? futureActive.reduce((max, r) => (r.dataPromemoria > max ? r.dataPromemoria : max), today)
      : today;
    return buildForwardCalendar(byDate, today, maxDate);
  }, [futureActive, today]);

  const pastCalendar = useMemo(() => buildDescendingDays(groupByDate(pastActive)), [pastActive]);
  const completedCalendar = useMemo(
    () => buildDescendingDays(groupByDate(completedReminders)),
    [completedReminders],
  );

  const bonusMatches = useMemo(() => {
    const term = form.bonusQuery.trim().toLowerCase();
    if (!term) return [];
    return bonuses
      .filter(
        (b) =>
          b.personaInvitata.toLowerCase().includes(term) ||
          b.piattaforma.toLowerCase().includes(term) ||
          b.ricevente.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [form.bonusQuery, bonuses]);

  const leadMatches = useMemo(() => {
    const term = form.leadQuery.trim().toLowerCase();
    if (!term) return [];
    return leads.filter((l) => l.nome.toLowerCase().includes(term)).slice(0, 8);
  }, [form.leadQuery, leads]);

  function closeCreate() {
    if (saving) return;
    setShowCreate(false);
    setForm(emptyForm());
    setCreateError("");
  }

  async function handleCreate() {
    if (!form.data || !form.descrizione.trim()) {
      setCreateError("Data e descrizione sono obbligatorie.");
      return;
    }
    setSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/promemoria/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusId: form.linkMode === "bonus" ? form.selectedBonus?.id ?? null : null,
          leadId: form.linkMode === "lead" ? form.selectedLead?.id ?? null : null,
          dataPromemoria: form.data,
          descrizione: form.descrizione.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio promemoria.");

      setShowCreate(false);
      setForm(emptyForm());
      await fetchReminders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setCreateError(message);
    } finally {
      setSaving(false);
    }
  }

  function openDetail(reminder: Reminder) {
    setDetail(reminder);
    setEditMode(false);
    setEditData(reminder.dataPromemoria);
    setEditDescrizione(reminder.descrizione);
    setDetailError("");
  }

  function closeDetail() {
    if (savingDetail) return;
    setDetail(null);
    setEditMode(false);
    setDetailError("");
  }

  async function handleToggleDone(reminder: Reminder) {
    setSavingDetail(true);
    setDetailError("");
    try {
      const res = await fetch("/api/promemoria/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reminder.id, completato: !reminder.completato }),
      });
      const data = (await res.json()) as { reminder?: Reminder; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore aggiornamento.");

      setReminders((prev) => prev.map((r) => (r.id === reminder.id ? data.reminder! : r)));
      setDetail((prev) => (prev && prev.id === reminder.id ? data.reminder! : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setDetailError(message);
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleSaveEdit() {
    if (!detail) return;
    if (!editData || !editDescrizione.trim()) {
      setDetailError("Data e descrizione sono obbligatorie.");
      return;
    }
    setSavingDetail(true);
    setDetailError("");
    try {
      const res = await fetch("/api/promemoria/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: detail.id,
          dataPromemoria: editData,
          descrizione: editDescrizione.trim(),
        }),
      });
      const data = (await res.json()) as { reminder?: Reminder; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore aggiornamento.");

      setReminders((prev) => prev.map((r) => (r.id === detail.id ? data.reminder! : r)));
      setDetail(data.reminder!);
      setEditMode(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setDetailError(message);
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/promemoria/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore eliminazione.");

      setReminders((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      setDetail(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setDetailError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Promemoria</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Calendario</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setCreateError("");
              setShowCreate(true);
            }}
            aria-label="Nuovo promemoria"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2D5BE3] text-white shadow-[0_4px_16px_rgba(45,91,227,0.35)] transition-colors hover:bg-[#2549b8]"
          >
            <Plus className="h-6 w-6" />
          </button>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-base text-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Caricamento promemoria...
          </div>
        ) : (
          <>
            <CalendarSection
              entries={forwardCalendar}
              today={today}
              platformColor={platformColor}
              onOpen={openDetail}
            />

            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              <button
                type="button"
                onClick={() => setShowPast((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/[0.07]"
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Giorni precedenti ({pastActive.length})
                </span>
                {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showPast ? (
                pastCalendar.length === 0 ? (
                  <p className="px-1 text-xs text-white/40">
                    Nessun promemoria scaduto negli ultimi {RETENTION_DAYS} giorni.
                  </p>
                ) : (
                  <CalendarSection
                    entries={pastCalendar}
                    today={today}
                    platformColor={platformColor}
                    onOpen={openDetail}
                  />
                )
              ) : null}

              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/[0.07]"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Promemoria completati ({completedReminders.length})
                </span>
                {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showCompleted ? (
                completedCalendar.length === 0 ? (
                  <p className="px-1 text-xs text-white/40">Nessun promemoria completato.</p>
                ) : (
                  <CalendarSection
                    entries={completedCalendar}
                    today={today}
                    platformColor={platformColor}
                    onOpen={openDetail}
                  />
                )
              ) : null}
            </div>
          </>
        )}
      </main>

      {showCreate ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60">
          <div className="min-h-[100dvh] w-full bg-[#0D1017] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <Bell className="h-5 w-5" /> Nuovo promemoria
              </h2>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={closeCreate}
                className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError ? (
              <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {createError}
              </div>
            ) : null}

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Data *</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                  className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Descrizione *</span>
                <textarea
                  value={form.descrizione}
                  onChange={(event) => setForm((prev) => ({ ...prev, descrizione: event.target.value }))}
                  rows={3}
                  placeholder="Cosa devi ricordarti di fare"
                  className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>

              <LinkPicker
                form={form}
                onFormChange={setForm}
                bonusMatches={bonusMatches}
                leadMatches={leadMatches}
                platformColor={platformColor}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-12 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-semibold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !form.data || !form.descrizione.trim()}
                onClick={() => void handleCreate()}
                className="min-h-14 w-full rounded-[14px] bg-[#2D5BE3] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#2549b8] disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60">
          <div className="min-h-[100dvh] w-full bg-[#0D1017] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editMode ? "Modifica promemoria" : "Promemoria"}
              </h2>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={closeDetail}
                className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailError ? (
              <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {detailError}
              </div>
            ) : null}

            {editMode ? (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-[13px] font-bold text-white">Data *</span>
                  <input
                    type="date"
                    value={editData}
                    onChange={(event) => setEditData(event.target.value)}
                    className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[13px] font-bold text-white">Descrizione *</span>
                  <textarea
                    value={editDescrizione}
                    onChange={(event) => setEditDescrizione(event.target.value)}
                    rows={4}
                    className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => setEditMode(false)}
                    className="min-h-12 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => void handleSaveEdit()}
                    className="min-h-14 w-full rounded-[14px] bg-[#2D5BE3] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#2549b8] disabled:opacity-60 sm:w-auto"
                  >
                    {savingDetail ? "Salvataggio..." : "Salva modifiche"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Data</p>
                  <p className="text-lg font-bold text-white">{formatItalianDate(detail.dataPromemoria)}</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Descrizione</p>
                  <p className="whitespace-pre-wrap text-base font-semibold text-white">
                    {detail.descrizione || "(senza descrizione)"}
                  </p>
                </div>

                {detail.bonus ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                      Bonus collegato
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-[12px] font-bold text-white"
                        style={{ backgroundColor: platformColor(detail.bonus.piattaforma) }}
                      >
                        {detail.bonus.piattaforma}
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-[12px] font-bold text-white"
                        style={{ backgroundColor: STATUS_COLORS[detail.bonus.stato] ?? "#374151" }}
                      >
                        {detail.bonus.stato || "-"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-bold text-white/45">Persona invitata</p>
                        <p className="font-semibold text-white">{detail.bonus.personaInvitata || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white/45">Ricevente</p>
                        <p className="font-semibold text-white">{detail.bonus.ricevente || "-"}</p>
                      </div>
                    </div>
                  </div>
                ) : detail.lead ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                      Lead collegato
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-[#2D5BE3]/20 px-3 py-1 text-[12px] font-bold text-[#7ea0ff]">
                        <Target className="h-3 w-3" /> LEAD
                      </span>
                      <span className="text-sm font-semibold text-white">{detail.lead.nome || "-"}</span>
                    </div>
                    {detail.lead.telefono ? (
                      <p className="mt-2 text-sm text-white/60">{detail.lead.telefono}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => void handleToggleDone(detail)}
                    className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                      detail.completato
                        ? "border border-white/10 bg-white/[0.04] text-white"
                        : "bg-emerald-500 text-white hover:bg-emerald-600"
                    }`}
                  >
                    {detail.completato ? (
                      <>
                        <Undo2 className="h-4 w-4" /> Segna da fare
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Segna come fatto
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" /> Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(detail.id)}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-red-500/90 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
                  >
                    <Trash2 className="h-4 w-4" /> Elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reminder-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="delete-reminder-title" className="text-[20px] font-bold text-neutral-900">
              Eliminare il promemoria?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-700">
              Questa azione non può essere annullata.
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
                  setDeleteId(null);
                }}
                className="min-h-12 rounded-xl bg-neutral-200 px-5 py-3 text-base font-bold text-neutral-800 disabled:opacity-60"
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
