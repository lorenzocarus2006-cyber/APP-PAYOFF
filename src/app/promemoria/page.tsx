"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STATIC_PLATFORMS,
  buildPlatformColorMap,
  mergePlatforms,
  type PlatformConfig,
} from "@/config/platforms";
import { formatDayHeader, formatItalianDate, isPastDate, todayISO } from "@/lib/date";
import type { BonusRecord, Reminder } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Bonus arrivato": "#16A34A",
  "Bonus in arrivo": "#D97706",
  "Registrato da completare": "#7C3AED",
  FAIL: "#DC2626",
};

type ReminderFormState = {
  data: string;
  descrizione: string;
  bonusQuery: string;
  selectedBonus: BonusRecord | null;
};

function emptyForm(): ReminderFormState {
  return { data: todayISO(), descrizione: "", bonusQuery: "", selectedBonus: null };
}

export default function PromemoriaPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bonuses, setBonuses] = useState<BonusRecord[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(STATIC_PLATFORMS);
  const [scadutiOpen, setScadutiOpen] = useState(false);

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
  }, []);

  useEffect(() => {
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

  const upcoming = useMemo(
    () => reminders.filter((r) => !isPastDate(r.dataPromemoria)),
    [reminders],
  );
  const past = useMemo(() => reminders.filter((r) => isPastDate(r.dataPromemoria)), [reminders]);

  const grouped = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const r of upcoming) {
      const arr = map.get(r.dataPromemoria) ?? [];
      arr.push(r);
      map.set(r.dataPromemoria, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming]);

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
          bonusId: form.selectedBonus?.id ?? null,
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

  function ReminderCard({ reminder }: { reminder: Reminder }) {
    const borderColor = reminder.bonus ? platformColor(reminder.bonus.piattaforma) : "rgba(255,255,255,0.25)";
    return (
      <button
        type="button"
        onClick={() => openDetail(reminder)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3.5 text-left shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform active:scale-[0.98] hover:bg-white/15"
        style={{ borderLeft: `4px solid ${borderColor}` }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white/60">{formatItalianDate(reminder.dataPromemoria)}</p>
            {reminder.completato ? (
              <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                ✔ FATTO
              </span>
            ) : null}
          </div>
          <p
            className={`mt-0.5 truncate text-sm font-semibold ${reminder.completato ? "text-white/50 line-through" : "text-white"}`}
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
              <span className="truncate text-[11px] text-white/60">
                {reminder.bonus.personaInvitata || "-"}
              </span>
            </div>
          ) : null}
        </div>
        <span className="shrink-0 text-white/30">›</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.14)] backdrop-blur-[20px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Promemoria</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">🔔 I tuoi promemoria</h1>
          <p className="mt-2 text-sm text-white/70">
            In ordine dal giorno di oggi in avanti. Aggiornato ogni giorno automaticamente.
          </p>
        </header>

        <button
          type="button"
          onClick={() => {
            setForm(emptyForm());
            setCreateError("");
            setShowCreate(true);
          }}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-transform active:scale-[0.98]"
        >
          ＋ Nuovo promemoria
        </button>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Caricamento promemoria...
          </div>
        ) : grouped.length === 0 && past.length === 0 ? (
          <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Nessun promemoria. Tocca &quot;+ Nuovo promemoria&quot; per crearne uno.
          </div>
        ) : (
          <>
            {grouped.length === 0 ? (
              <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
                Nessun promemoria in arrivo.
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map(([date, items]) => (
                  <section key={date} className="space-y-2">
                    <h2 className="flex items-baseline gap-2 text-base font-bold uppercase tracking-wide text-white/70">
                      {formatDayHeader(date)}
                      {date === todayISO() ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-white">
                          Oggi
                        </span>
                      ) : null}
                    </h2>
                    <div className="space-y-2">
                      {items.map((reminder) => (
                        <ReminderCard key={reminder.id} reminder={reminder} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {past.length > 0 ? (
              <section className="space-y-2">
                <button
                  type="button"
                  onClick={() => setScadutiOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/8 px-4 py-3 text-left text-sm font-bold text-white/70"
                >
                  <span>⏳ Scaduti ({past.length})</span>
                  <span>{scadutiOpen ? "▲" : "▼"}</span>
                </button>
                {scadutiOpen ? (
                  <div className="space-y-2">
                    {past.map((reminder) => (
                      <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </main>

      {showCreate ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-[24px] font-bold text-white">🔔 Nuovo promemoria</h2>

            {createError ? (
              <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
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
                  className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Descrizione *</span>
                <textarea
                  value={form.descrizione}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, descrizione: event.target.value }))
                  }
                  rows={3}
                  placeholder="Cosa devi ricordarti di fare"
                  className="w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <div className="space-y-1">
                <span className="text-[13px] font-bold text-white">Collega a un bonus (opzionale)</span>
                {form.selectedBonus ? (
                  <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/30 bg-white/15 px-4 py-3">
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
                      onClick={() => setForm((prev) => ({ ...prev, selectedBonus: null }))}
                      className="text-sm font-bold text-white/70 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={form.bonusQuery}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, bonusQuery: event.target.value }))
                      }
                      placeholder="Cerca persona, piattaforma o ricevente..."
                      className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                    />
                    {bonusMatches.length > 0 ? (
                      <div className="mt-1 max-h-48 overflow-y-auto rounded-[14px] border border-white/30 bg-[#1a3a8f] shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                        {bonusMatches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({ ...prev, selectedBonus: b, bonusQuery: "" }))
                            }
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/15"
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
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-12 rounded-[14px] border border-white/30 bg-white/15 px-5 py-3 text-lg font-bold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !form.data || !form.descrizione.trim()}
                onClick={() => void handleCreate()}
                className="min-h-14 w-full rounded-[14px] bg-white px-5 py-3 text-[18px] font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[22px] font-bold text-white">
                {editMode ? "Modifica promemoria" : "Promemoria"}
              </h2>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={closeDetail}
                className="text-2xl text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            {detailError ? (
              <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
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
                    className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[13px] font-bold text-white">Descrizione *</span>
                  <textarea
                    value={editDescrizione}
                    onChange={(event) => setEditDescrizione(event.target.value)}
                    rows={4}
                    className="w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/25"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => setEditMode(false)}
                    className="min-h-12 rounded-[14px] border border-white/30 bg-white/15 px-5 py-3 text-lg font-bold text-white disabled:opacity-60"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => void handleSaveEdit()}
                    className="min-h-14 w-full rounded-[14px] bg-white px-5 py-3 text-[18px] font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 sm:w-auto"
                  >
                    {savingDetail ? "Salvataggio..." : "Salva modifiche"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-white/60">Data</p>
                  <p className="text-lg font-bold text-white">{formatItalianDate(detail.dataPromemoria)}</p>
                </div>

                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-white/60">Descrizione</p>
                  <p className="whitespace-pre-wrap text-base font-semibold text-white">
                    {detail.descrizione || "(senza descrizione)"}
                  </p>
                </div>

                {detail.bonus ? (
                  <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-white/60">
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
                        <p className="text-[11px] font-bold text-white/60">Persona invitata</p>
                        <p className="font-semibold text-white">{detail.bonus.personaInvitata || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white/60">Ricevente</p>
                        <p className="font-semibold text-white">{detail.bonus.ricevente || "-"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingDetail}
                    onClick={() => void handleToggleDone(detail)}
                    className={`min-h-12 flex-1 rounded-[14px] px-4 py-3 text-base font-bold shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 ${
                      detail.completato
                        ? "border border-white/30 bg-white/15 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {detail.completato ? "↩ Segna da fare" : "✔ Segna come fatto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="min-h-12 flex-1 rounded-[14px] border border-white/30 bg-white/15 px-4 py-3 text-base font-bold text-white"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(detail.id)}
                    className="min-h-12 flex-1 rounded-[14px] bg-[#DC2626] px-4 py-3 text-base font-bold text-white"
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
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
