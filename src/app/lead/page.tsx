"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronRight, Plus } from "lucide-react";
import { STATIC_PLATFORMS, buildPlatformColorMap, type PlatformConfig } from "@/config/platforms";
import ReminderBellButton from "@/components/ReminderBellButton";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

type LeadForm = {
  nome: string;
  telefono: string;
  descrizione: string;
  bonusInteresse: string[];
};

const defaultForm: LeadForm = {
  nome: "",
  telefono: "",
  descrizione: "",
  bonusInteresse: [],
};

export default function LeadPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadForm>(defaultForm);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(STATIC_PLATFORMS);
  const [lastCreatedLead, setLastCreatedLead] = useState<{ id: number; label: string } | null>(
    null,
  );
  const [bellForceOpen, setBellForceOpen] = useState(false);
  const platformColorMap = useMemo(() => buildPlatformColorMap(platforms), [platforms]);
  function platformColor(name: string) {
    return platformColorMap[name] ?? "#2D7DD2";
  }

  async function fetchLeads() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads/read", { cache: "no-store" });
      const data = (await res.json()) as { leads?: Lead[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore caricamento lead.");
      setLeads(data.leads ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchLeads();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/platforms/read", { cache: "no-store" });
        const data = (await res.json()) as { platforms?: PlatformConfig[] };
        if (res.ok && data.platforms?.length) setPlatforms(data.platforms);
      } catch {
        // mantiene il fallback STATIC_PLATFORMS
      }
    })();
  }, []);

  function toggleBonus(platform: string) {
    setForm((prev) => ({
      ...prev,
      bonusInteresse: prev.bonusInteresse.includes(platform)
        ? prev.bonusInteresse.filter((p) => p !== platform)
        : [...prev.bonusInteresse, platform],
    }));
  }

  async function handleSave(options?: { openReminder?: boolean }) {
    if (!form.nome.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/leads/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { lead?: Lead; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio lead.");

      if (data.lead) {
        setLastCreatedLead({ id: data.lead.id, label: data.lead.nome || "(senza nome)" });
        if (options?.openReminder) setBellForceOpen(true);
      }
      setShowModal(false);
      setForm(defaultForm);
      await fetchLeads();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Lead</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Persone da contattare</h1>
          <p className="mt-2 text-sm text-white/70">
            Persone potenziali non ancora salvate, da ricontattare per i bonus.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setForm(defaultForm);
            setShowModal(true);
          }}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D5BE3] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#2549b8]"
        >
          <Plus className="h-5 w-5" /> Aggiungi nuovo lead
        </button>

        {lastCreatedLead ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <p className="min-w-0 flex-1 truncate text-sm text-white/70">
              Vuoi un promemoria per contattare{" "}
              <span className="font-semibold">{lastCreatedLead.label}</span>?
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <ReminderBellButton
                link={{ type: "lead", id: lastCreatedLead.id }}
                label={lastCreatedLead.label}
                variant="button"
                open={bellForceOpen}
                onOpenChange={setBellForceOpen}
                onSaved={() => {
                  setLastCreatedLead(null);
                  setBellForceOpen(false);
                }}
              />
            </div>
          </div>
        ) : null}

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-base text-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              Caricamento lead...
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-base text-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              Nessun lead salvato.
            </div>
          ) : (
            <ul className="space-y-3">
              {leads.map((lead, index) => (
                <li
                  key={lead.id}
                  className="animate-[fadeSlide_0.4s_ease_both]"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <Link
                    href={`/lead/${lead.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-colors duration-200 active:scale-[0.98] hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-base font-bold uppercase text-white">
                      {lead.nome.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold leading-tight">{lead.nome}</p>
                      {lead.bonusInteresse.length > 0 ? (
                        <p className="mt-0.5 text-xs text-white/50">
                          {lead.bonusInteresse.length} bonus di interesse
                        </p>
                      ) : null}
                    </div>
                    <span
                      onClick={(event) => event.preventDefault()}
                      className="shrink-0"
                    >
                      <ReminderBellButton
                        link={{ type: "lead", id: lead.id }}
                        label={lead.nome || "(senza nome)"}
                      />
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[#11141C] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-[24px] font-bold text-white">Nuovo lead</h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Nome e Cognome *</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  autoFocus
                  className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Telefono</span>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, telefono: event.target.value }))
                  }
                  className="min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Descrizione dello status</span>
                <textarea
                  value={form.descrizione}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, descrizione: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[13px] font-bold text-white">Bonus da fare</span>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => {
                    const active = form.bonusInteresse.includes(platform.key);
                    const color = platformColor(platform.key);
                    return (
                      <button
                        key={platform.key}
                        type="button"
                        onClick={() => toggleBonus(platform.key)}
                        className="rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors"
                        style={
                          active
                            ? {
                                backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                                borderColor: color,
                                color: "#ffffff",
                              }
                            : {
                                backgroundColor: "rgba(255,255,255,0.1)",
                                borderColor: "rgba(255,255,255,0.3)",
                                color: "#ffffff",
                              }
                        }
                      >
                        <span className="flex items-center gap-1">
                          {active ? <Check className="h-3.5 w-3.5" /> : null}
                          {platform.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-12 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-semibold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                aria-label="Salva e aggiungi promemoria"
                disabled={saving || !form.nome.trim()}
                onClick={() => void handleSave({ openReminder: true })}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                <Bell className="h-4 w-4" /> Salva + promemoria
              </button>
              <button
                type="button"
                disabled={saving || !form.nome.trim()}
                onClick={() => void handleSave()}
                className="min-h-14 w-full rounded-[14px] bg-[#2D5BE3] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#2549b8] disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
