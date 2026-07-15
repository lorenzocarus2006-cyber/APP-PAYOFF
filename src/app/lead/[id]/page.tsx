"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PLATFORMS } from "@/config/dropdowns";
import type { Lead } from "@/lib/types";

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

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<LeadForm>({
    nome: "",
    telefono: "",
    descrizione: "",
    bonusInteresse: [],
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchLead() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads/read", { cache: "no-store" });
      const data = (await res.json()) as { leads?: Lead[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore lettura lead.");
      const found = (data.leads ?? []).find((l) => String(l.id) === id) ?? null;
      if (!found) {
        setNotFoundError(true);
      } else {
        setNotFoundError(false);
        setLead(found);
        setForm({
          nome: found.nome,
          telefono: found.telefono,
          descrizione: found.descrizione,
          bonusInteresse: found.bonusInteresse,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchLead();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleBonus(platform: string) {
    setForm((prev) => ({
      ...prev,
      bonusInteresse: prev.bonusInteresse.includes(platform)
        ? prev.bonusInteresse.filter((p) => p !== platform)
        : [...prev.bonusInteresse, platform],
    }));
  }

  async function handleSaveEdit() {
    if (!form.nome.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { lead?: Lead; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore aggiornamento lead.");

      setLead(data.lead ?? null);
      setShowEdit(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore eliminazione lead.");

      router.push("/lead");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-white">
      <main className="mx-auto w-full space-y-6">
        <Link
          href="/lead"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Lead
        </Link>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Caricamento lead...
          </div>
        ) : notFoundError || !lead ? (
          <div className="rounded-[20px] border border-white/25 bg-white/12 p-6 text-base text-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Lead non trovato.
          </div>
        ) : (
          <>
            <header className="overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.14)] backdrop-blur-[20px]">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold uppercase">
                  {lead.nome.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Lead
                  </p>
                  <h1 className="truncate text-2xl font-bold tracking-tight">{lead.nome}</h1>
                  {lead.telefono ? (
                    <a
                      href={`tel:${lead.telefono}`}
                      className="mt-0.5 block text-sm text-white/70 hover:text-white"
                    >
                      📞 {lead.telefono}
                    </a>
                  ) : null}
                </div>
              </div>

              {lead.descrizione ? (
                <div className="mt-5 rounded-2xl bg-black/15 px-4 py-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-white/60">
                    Status
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">
                    {lead.descrizione}
                  </p>
                </div>
              ) : null}

              {lead.bonusInteresse.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {lead.bonusInteresse.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: platformColor(platform) }}
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  className="min-h-12 flex-1 rounded-2xl border border-white/30 bg-white/15 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-white/25"
                >
                  ✏️ Modifica
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="min-h-12 flex-1 rounded-2xl border border-red-300/40 bg-red-500/15 px-5 py-3 text-base font-bold text-red-100 transition-colors hover:bg-red-500/25"
                >
                  🗑️ Elimina
                </button>
              </div>
            </header>
          </>
        )}
      </main>

      {showEdit ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-[100dvh] w-full bg-[linear-gradient(160deg,#4A90E2_0%,#2D5BE3_40%,#1a3a8f_100%)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:my-4 sm:min-h-0 sm:max-w-[460px] sm:rounded-2xl sm:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <h2 className="mb-4 text-[24px] font-bold text-white">Modifica lead</h2>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[13px] font-bold text-white">Nome e Cognome *</span>
                <input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
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
                onClick={() => setShowEdit(false)}
                className="min-h-12 rounded-[14px] border border-white/30 bg-white/15 px-5 py-3 text-lg font-bold text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !form.nome.trim()}
                onClick={() => void handleSaveEdit()}
                className="min-h-14 w-full rounded-[14px] bg-white px-5 py-3 text-[18px] font-bold text-[#2D5BE3] shadow-[0_8px_20px_rgba(0,0,0,0.2)] disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setShowDeleteConfirm(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-[20px] font-bold text-neutral-900">Elimina lead?</h2>
            <p className="mt-3 text-base leading-relaxed text-neutral-700">
              Sei sicuro di voler eliminare{" "}
              <span className="font-semibold">{lead?.nome}</span>? Questa azione non può essere
              annullata.
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
                  setShowDeleteConfirm(false);
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
