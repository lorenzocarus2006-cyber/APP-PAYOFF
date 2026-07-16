"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BilancioOverview, BilancioReceiverStats } from "@/lib/types";
import BilancioView from "../BilancioView";

type BilancioResponse = {
  overview: BilancioOverview;
  riceventi: BilancioReceiverStats[];
  error?: string;
};

export default function StoricoClient() {
  const [overview, setOverview] = useState<BilancioOverview | null>(null);
  const [riceventi, setRiceventi] = useState<BilancioReceiverStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/bilancio/stats?scope=storico", { cache: "no-store" });
        const data = (await res.json()) as BilancioResponse;
        if (!res.ok) throw new Error(data.error ?? "Errore nel caricamento dello storico.");
        setOverview(data.overview);
        setRiceventi(data.riceventi ?? []);
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
      loading={loading}
      error={error}
      title="Storico 📜"
      subtitle="Bonus precedenti al 14/07/2026 (solo og)"
      scope="storico"
      headerAction={
        <Link
          href="/bilancio"
          className="shrink-0 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
        >
          ← Bilancio
        </Link>
      }
    />
  );
}
