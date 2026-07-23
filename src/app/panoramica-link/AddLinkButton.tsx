"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PlatformConfig } from "@/config/platforms";

type RecipientOption = { id: number; name: string; linkCount: number };

type Mode = "esistente" | "nuovo";

type Props = {
  platforms: PlatformConfig[];
  recipients: RecipientOption[];
};

export default function AddLinkButton({ platforms, recipients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [piattaforma, setPiattaforma] = useState<string>(platforms[0]?.key ?? "");
  const [mode, setMode] = useState<Mode>("esistente");
  const [selectedName, setSelectedName] = useState("");
  const [filterText, setFilterText] = useState("");
  const [newName, setNewName] = useState("");
  const [url, setUrl] = useState("");

  const filteredRecipients = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((r) => r.name.toLowerCase().includes(term));
  }, [recipients, filterText]);

  const existingMatch = useMemo(() => {
    const term = newName.trim().toLowerCase();
    if (!term) return null;
    return recipients.find((r) => r.name.trim().toLowerCase() === term) ?? null;
  }, [newName, recipients]);

  const intestatario = (mode === "esistente" ? selectedName : newName).trim();

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
  }

  function resetFormState() {
    setMode("esistente");
    setSelectedName("");
    setFilterText("");
    setNewName("");
    setUrl("");
  }

  async function handleSave() {
    if (!intestatario) {
      setError(mode === "esistente" ? "Seleziona un ricevente." : "Inserisci l'intestatario.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/links/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piattaforma, intestatario, url: url.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore salvataggio link.");

      setOpen(false);
      resetFormState();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full !min-h-14 text-lg"
      >
        ＋ Aggiungi link
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0F1420] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          >
            <h2 className="text-xl font-bold text-white">Nuovo link</h2>
            <p className="mt-1 text-sm text-white/70">
              Salvalo nella sezione del bonus giusto, resta lì anche dopo il reload.
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="field-label">Bonus / Piattaforma</span>
                <select
                  value={piattaforma}
                  onChange={(event) => setPiattaforma(event.target.value)}
                  className="field-select"
                >
                  {platforms.map((option) => (
                    <option key={option.key} value={option.key} className="bg-[#0F1420] text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="field-label">Intestatario</span>
                  <div className="flex overflow-hidden rounded-full border border-white/20 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setMode("esistente")}
                      className={`px-3 py-1 transition-colors ${
                        mode === "esistente" ? "bg-white text-[#0F1420]" : "text-white/60"
                      }`}
                    >
                      Esistente
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("nuovo")}
                      className={`px-3 py-1 transition-colors ${
                        mode === "nuovo" ? "bg-white text-[#0F1420]" : "text-white/60"
                      }`}
                    >
                      Nuovo
                    </button>
                  </div>
                </div>

                {mode === "esistente" ? (
                  <div className="space-y-2">
                    <input
                      value={filterText}
                      onChange={(event) => setFilterText(event.target.value)}
                      placeholder="Cerca ricevente..."
                      className="field-input"
                    />
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10">
                      {filteredRecipients.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-white/50">Nessun ricevente trovato.</p>
                      ) : (
                        filteredRecipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedName(r.name)}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                              selectedName === r.name
                                ? "bg-white/15 text-white"
                                : "text-white/80 hover:bg-white/5"
                            }`}
                          >
                            <span className="font-semibold">{r.name}</span>
                            <span className="text-xs text-white/50">{r.linkCount} link</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="Nome intestatario"
                      className="field-input"
                    />
                    {existingMatch ? (
                      <p className="text-xs font-medium text-amber-300">
                        Ricevente già esistente, verrà collegato a quello.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <label className="block space-y-1">
                <span className="field-label">Link o codice</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saving) {
                      event.preventDefault();
                      void handleSave();
                    }
                  }}
                  placeholder="https://... oppure codice invito (opzionale)"
                  className="field-input"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="min-h-12 flex-1 rounded-2xl border border-white/40 bg-transparent px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving || !intestatario}
                onClick={() => void handleSave()}
                className="btn-primary flex-1"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
