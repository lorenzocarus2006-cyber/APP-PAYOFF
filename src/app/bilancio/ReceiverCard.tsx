"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, Clock, ListTodo } from "lucide-react";
import type { BilancioReceiverStats } from "@/lib/types";
import type { ReceiverBonusRow } from "./aggregateReceiverStats";
import { money, platformColor, statusColor } from "./shared";

type Props = {
  receiver: BilancioReceiverStats;
  expanded: boolean;
  onToggle: () => void;
  scope?: "current" | "storico";
};

function ValueChip({
  icon,
  label,
  value,
  colorHex,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  colorHex: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span style={{ color: colorHex }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-white/40">{label}</p>
        <p
          className="truncate font-mono text-[13px] font-bold tabular-nums"
          style={{ color: colorHex }}
        >
          {money(value)}
        </p>
      </div>
    </div>
  );
}

export default function ReceiverCard({ receiver, expanded, onToggle, scope = "current" }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ReceiverBonusRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    onToggle();
    if (rows !== null || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/bilancio/ricevente?ricevente=${encodeURIComponent(receiver.ricevente)}${
          scope === "storico" ? "&scope=storico" : ""
        }`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { rows?: ReceiverBonusRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento.");
      const sorted = [...(data.rows ?? [])].sort((a, b) => b.data.localeCompare(a.data));
      setRows(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827] shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
      <div className="flex">
        <div className="w-1 shrink-0 bg-white/15" />
        <button
          type="button"
          onClick={() => void handleToggle()}
          className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 text-left transition-colors active:bg-white/[0.03]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-[17px] font-semibold text-white">
              {receiver.ricevente}
            </h3>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
          <div className="flex items-center gap-3">
            <ValueChip
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Arrivato"
              value={receiver.total.arrivato}
              colorHex={statusColor("Bonus arrivato")}
            />
            <ValueChip
              icon={<Clock className="h-4 w-4" />}
              label="In arrivo"
              value={receiver.total.arrivo}
              colorHex={statusColor("Bonus in arrivo")}
            />
            <ValueChip
              icon={<ListTodo className="h-4 w-4" />}
              label="Da completare"
              value={receiver.total.daFare}
              colorHex={statusColor("Registrato da completare")}
            />
          </div>
        </button>
      </div>

      {expanded ? (
        <div className="animate-[fadeSlide_0.25s_ease_both] border-t border-white/[0.06] p-3">
          {error ? (
            <p className="px-2 py-3 text-sm text-red-300">{error}</p>
          ) : loading ? (
            <p className="px-2 py-3 text-sm text-white/40">Caricamento...</p>
          ) : !rows || rows.length === 0 ? (
            <p className="px-2 py-3 text-sm text-white/40">Nessun bonus registrato.</p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/?q=${encodeURIComponent(row.personaInvitata)}&ricevente=${encodeURIComponent(
                          receiver.ricevente,
                        )}`,
                      )
                    }
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: platformColor(row.piattaforma.toUpperCase()) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {row.personaInvitata || "—"}{" "}
                        <span className="font-normal text-white/40">· {row.piattaforma}</span>
                      </span>
                      <span
                        className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: statusColor(row.stato) }}
                      >
                        {row.stato}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-white">
                      {money(row.netto)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
