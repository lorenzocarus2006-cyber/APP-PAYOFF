"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BilancioDetail, BilancioOverview, BilancioReceiverStats } from "@/lib/types";
import BilancioView from "./BilancioView";

type BilancioResponse = {
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
  detail: BilancioDetail;
  role?: "og" | "salvo";
  error?: string;
};

export const dynamic = "force-dynamic";

export default function BilancioPage() {
  const [overview, setOverview] = useState<BilancioOverview | null>(null);
  const [riceventi, setRiceventi] = useState<BilancioReceiverStats[]>([]);
  const [detail, setDetail] = useState<BilancioDetail | null>(null);
  const [role, setRole] = useState<"og" | "salvo" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/bilancio/stats", { cache: "no-store" });
        const data = (await res.json()) as BilancioResponse;
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento del bilancio.");
        setOverview(data.overview);
        setRiceventi(data.riceventi ?? []);
        setDetail(data.detail ?? null);
        setRole(data.role ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore sconosciuto.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <BilancioView
      overview={overview}
      riceventi={riceventi}
      detail={detail}
      loading={loading}
      error={error}
      title="Bilancio 🏦"
      subtitle="Overview e dettaglio per ricevente (da oggi in poi)"
      scope="current"
      headerAction={
        role === "og" ? (
          <Link
            href="/bilancio/storico"
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
          >
            📜 Storico
          </Link>
        ) : undefined
      }
    />
  );
}
