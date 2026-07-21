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

    // Le stats principali del Bilancio devono SEMPRE tornare, anche se la Liquidità fallisce:
    // per questo sono due fetch separati (non un Promise.all) invece che accoppiati in un solo
    // fallimento tutto-o-niente.
    const data = await readBilancioStats(wantsStorico ? "storico" : "current");

    let liquidita: {
      configured: boolean;
      valore: number;
      valoreIniziale: number;
      speseDedotte: number;
      prelieviTotali: number;
      dataAttivazione: string | null;
    } | null = null;
    try {
      const liquiditaOverview = await getLiquiditaOverview({ includeLedger: false });
      liquidita = {
        configured: liquiditaOverview.config !== null,
        valore: liquiditaOverview.valore,
        valoreIniziale: liquiditaOverview.valoreIniziale,
        speseDedotte: liquiditaOverview.speseDedotte,
        prelieviTotali: liquiditaOverview.prelieviTotali,
        dataAttivazione: liquiditaOverview.config?.dataAttivazione ?? null,
      };
    } catch (liquiditaError) {
      console.error("Liquidità non disponibile, il Bilancio prosegue senza:", liquiditaError);
    }

    return NextResponse.json({ ...data, role, liquidita });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il calcolo del bilancio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
