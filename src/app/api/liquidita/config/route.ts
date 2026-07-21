import { NextResponse } from "next/server";
import { upsertLiquiditaConfig } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  valoreIniziale?: number;
  dataAttivazione?: string;
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const valoreIniziale = Number(body.valoreIniziale);
    const dataAttivazione = body.dataAttivazione?.trim() ?? "";

    if (!Number.isFinite(valoreIniziale)) {
      return NextResponse.json({ error: "Valore iniziale non valido." }, { status: 400 });
    }
    if (!dataAttivazione) {
      return NextResponse.json({ error: "Data di attivazione obbligatoria." }, { status: 400 });
    }

    await upsertLiquiditaConfig({ valoreIniziale, dataAttivazione });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante il salvataggio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
