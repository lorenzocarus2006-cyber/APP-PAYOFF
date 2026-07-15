"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLATFORMS } from "@/config/dropdowns";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const PLATFORM_COLORS: Record<string, string> = {
  COINBASE: "#0052FF",
  REVOLUT: "#374151",
  ING: "#FF6200",
  ISYBANK: "#FF6B35",
  BBVA: "#004481",
  BUDDYBANK: "#FF4B7B",
  BINANCE: "#D4A017",
  KRAKEN: "#5741D9",
  MYFIN: "#0D9488",
};

function platformColor(name: string) {
  return PLATFORM_COLORS[name] ?? "#2D7DD2";
}

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

  function toggleBonus(platform: string) {
    setForm((prev) => ({
      ...prev,
      bonusInteresse: prev.bonusInteresse.includes(platform)
        ? prev.bonusInteresse.filter((p) => p !== platform)
        : [...prev.bonusInteresse, platform],
    }));
  }

  async function handleSave() {
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
        <header className="overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.14)] backdrop-blur-[20px]">
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
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-lg font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-transform active:scale-[0.98]"
        >
          ＋ Aggiungi nuovo lead
        </button>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
              Caricamento lead...
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
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
                    className="group flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition-transform duration-200 active:scale-[0.98] hover:border-white/40 hover:bg-white/15"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-base font-bold uppercase text-white">
                      {lead.nome.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold leading-tight">{lead.nome}</p>
                      {lead.bonusInteresse.length > 0 ? (
                        <p className="mt-0.5 text-xs text-white/55">
                          {lead.bonusInteresse.length} bonus di interesse
                        </p>
                      ) : null}
                    </div>
                    <svg
                      className="h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/70"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showModal ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-[24px] font-bold text-white">Nuovo lead</h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Nome e Cognome *</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  autoFocus
                  className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
                  className="min-h-12 w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
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
                  className="w-full rounded-[14px] border border-white/30 bg-white/15 px-4 py-[14px] text-[16px] font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 focus:ring-2 focus:ring-white/25"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[13px] font-bold text-white">Bonus da fare</span>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => {
                    const active = form.bonusInteresse.includes(platform);
                    const color = platformColor(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => toggleBonus(platform)}
                        className="rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors"
                        style={
                          active
                            ? { backgroundColor: color, borderColor: color, color: "#ffffff" }
                            : {
                                backgroundColor: "rgba(255,255,255,0.1)",
                                borderColor: "rgba(255,255,255,0.3)",
                                color: "#ffffff",
                              }
                        }
                      >
                        {active ? "✓ " : ""}
                        {platform}
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
                className="min-h-12 rounded-[14px] border border-white/30 bg-white/15 px-5 py-3 text-lg font-bold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !form.nome.trim()}
                onClick={() => void handleSave()}
                className="min-h-14 w-full rounded-[14px] bg-white px-5 py-3 text-[18px] font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 sm:w-auto"
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
