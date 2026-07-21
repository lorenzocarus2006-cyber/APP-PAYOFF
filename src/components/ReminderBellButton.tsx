"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check } from "lucide-react";
import { todayISO } from "@/lib/date";

type ReminderLink =
  | { type: "bonus"; id: number }
  | { type: "lead"; id: number };

type Props = {
  link: ReminderLink;
  label: string;
  variant?: "icon" | "button";
  /** Icona a campana: "lucide" (default) o "emoji" 🔔 per farla risaltare nelle card dei risultati. */
  iconStyle?: "lucide" | "emoji";
  onSaved?: () => void;
  /** Se passato, l'apertura del popup è controllata dal genitore (usato per aprirlo subito dopo un salvataggio). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Bottone 🔔 riusabile: apre un piccolo form (data + descrizione) e crea un promemoria collegato a un bonus o a un lead.
 * Il popup è renderizzato con un portal in document.body: se il bottone vive dentro una card con
 * un'animazione d'ingresso (transform), un modal "fixed" annidato lì dentro erediterebbe quel transform
 * come nuovo containing block e verrebbe posizionato/ritagliato in modo sbagliato invece di coprire lo
 * schermo — è la causa reale dei popup che sembravano "trasparenti"/rotti aperti dalle card.
 */
export default function ReminderBellButton({
  link,
  label,
  variant = "icon",
  iconStyle = "lucide",
  onSaved,
  open: openProp,
  onOpenChange,
}: Props) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;
  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(todayISO());
  const [descrizione, setDescrizione] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  async function handleSave() {
    if (!descrizione.trim()) {
      setError("Inserisci una descrizione.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/promemoria/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusId: link.type === "bonus" ? link.id : null,
          leadId: link.type === "lead" ? link.id : null,
          dataPromemoria: data,
          descrizione: descrizione.trim(),
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Errore salvataggio promemoria.");

      setOpen(false);
      setData(todayISO());
      setDescrizione("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/60 p-5 backdrop-blur-sm"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-[20px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
              style={{ backgroundColor: "#0F1420" }}
            >
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Bell className="h-5 w-5" /> Nuovo promemoria
                </h2>
                <p className="mt-1 text-sm text-white/60">{label}</p>

                {error ? (
                  <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 space-y-4">
                  <label className="block space-y-1">
                    <span className="text-sm text-white/60">Data</span>
                    <input
                      type="date"
                      value={data}
                      onChange={(event) => setData(event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-base font-semibold text-white outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm text-white/60">Cosa fare</span>
                    <textarea
                      value={descrizione}
                      onChange={(event) => setDescrizione(event.target.value)}
                      autoFocus
                      rows={3}
                      placeholder="Es. Controllare se il bonus è arrivato"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/[0.06] p-6 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={close}
                  className="min-h-12 flex-1 rounded-xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={saving || !descrizione.trim()}
                  onClick={() => void handleSave()}
                  className="min-h-12 flex-1 rounded-xl bg-[#2D5BE3] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2549b8] disabled:opacity-50"
                >
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Aggiungi promemoria"
          onClick={() => setOpen(true)}
          className={
            iconStyle === "emoji"
              ? "grid h-8 w-8 place-items-center rounded-full text-[19px] leading-none transition-colors hover:bg-white/10"
              : "grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          }
        >
          {saved ? (
            <Check className="h-[18px] w-[18px] text-emerald-400" />
          ) : iconStyle === "emoji" ? (
            "🔔"
          ) : (
            <Bell className="h-[18px] w-[18px]" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" /> Promemoria aggiunto
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" /> Aggiungi promemoria
            </>
          )}
        </button>
      )}

      {modal}
    </>
  );
}
