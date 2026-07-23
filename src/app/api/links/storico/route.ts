import { NextResponse } from "next/server";
import { readBonusRows } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const piattaforma = searchParams.get("piattaforma")?.trim().toUpperCase() ?? "";
    const ricevente = searchParams.get("ricevente")?.trim().toLowerCase() ?? "";
    if (!piattaforma || !ricevente) {
      return NextResponse.json({ error: "Piattaforma e ricevente sono obbligatori." }, { status: 400 });
    }

    const bonuses = await readBonusRows("all");
    const rows = bonuses
      .filter(
        (row) =>
          row.piattaforma.trim().toUpperCase() === piattaforma &&
          row.ricevente.trim().toLowerCase() === ricevente,
      )
      .map((row) => ({
        personaInvitata: row.personaInvitata,
        data: row.data,
        stato: row.stato,
        netto: row.netto,
      }))
      .sort((a, b) => b.data.localeCompare(a.data));

    return NextResponse.json({ rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante la lettura dello storico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
