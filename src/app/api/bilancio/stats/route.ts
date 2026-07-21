import { NextResponse } from "next/server";
import { getLiquiditaOverview, readBilancioStats } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const wantsStorico = searchParams.get("scope") === "storico";

    if (wantsStorico && role !== "og") {
      return NextResponse.json(
        { error: "Non hai i permessi per vedere lo storico." },
        { status: 403 },
      );
    }

    const [data, liquiditaOverview] = await Promise.all([
      readBilancioStats(wantsStorico ? "storico" : "current"),
      getLiquiditaOverview({ includeLedger: false }),
    ]);
    const liquidita = {
      configured: liquiditaOverview.config !== null,
      valore: liquiditaOverview.valore,
      valoreIniziale: liquiditaOverview.valoreIniziale,
      speseDedotte: liquiditaOverview.speseDedotte,
      prelieviTotali: liquiditaOverview.prelieviTotali,
      dataAttivazione: liquiditaOverview.config?.dataAttivazione ?? null,
    };
    return NextResponse.json({ ...data, role, liquidita });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il calcolo del bilancio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
