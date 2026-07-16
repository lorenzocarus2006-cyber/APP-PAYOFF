"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReceiverDetailCard from "../../ReceiverDetailCard";
import { aggregateReceiverStats, type ReceiverBonusRow } from "../../aggregateReceiverStats";

export const dynamic = "force-dynamic";

type BilancioReceiverResponse = {
  rows: ReceiverBonusRow[];
  error?: string;
};

export default function ReceiverDetailPage() {
  const params = useParams<{ nome: string }>();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "storico" ? "storico" : "current";
  const nome = decodeURIComponent(params.nome);

  const [rows, setRows] = useState<ReceiverBonusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFiniti, setShowFiniti] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/bilancio/ricevente?ricevente=${encodeURIComponent(nome)}${
            scope === "storico" ? "&scope=storico" : ""
          }`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as BilancioReceiverResponse;
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento del bilancio.");
        setRows(data.rows ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [nome, scope]);

  const { attivi, finiti } = useMemo(() => {
    const attivi: ReceiverBonusRow[] = [];
    const finiti: ReceiverBonusRow[] = [];
    for (const row of rows) {
      (row.stato === "Bonus arrivato" ? finiti : attivi).push(row);
    }
    return { attivi, finiti };
  }, [rows]);

  const attiviStats = useMemo(() => aggregateReceiverStats(nome, attivi), [nome, attivi]);
  const finitiStats = useMemo(() => aggregateReceiverStats(nome, finiti), [nome, finiti]);

  const backHref = scope === "storico" ? "/bilancio/storico" : "/bilancio";

  return (
    <div className="min-h-screen bg-transparent px-5 py-5 text-white">
      <main className="mx-auto w-full space-y-5 pb-6">
        <header className="flex items-start justify-between gap-3 rounded-2xl border border-white/25 bg-white/10 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{nome}</h1>
            <p className="mt-2 text-base text-white/70">Panoramica completa</p>
          </div>
          <Link
            href={backHref}
            className="shrink-0 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
          >
            ← Bilancio
          </Link>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/25 bg-white/10 p-6 text-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur-[20px]">
            Caricamento...
          </div>
        ) : (
          <>
            <ReceiverDetailCard receiver={attiviStats} />

            <section>
              <button
                type="button"
                onClick={() => setShowFiniti((prev) => !prev)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/15"
              >
                <span className="flex items-center gap-2">
                  🏁 Bonus finiti
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold tabular-nums text-white/80">
                    {finiti.length}
                  </span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-5 w-5 text-white/70 transition-transform duration-300 ${
                    showFiniti ? "rotate-180" : ""
                  }`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showFiniti ? (
                <div className="mt-3">
                  <ReceiverDetailCard receiver={finitiStats} />
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
