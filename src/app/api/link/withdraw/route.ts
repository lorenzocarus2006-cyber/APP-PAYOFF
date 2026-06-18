import { NextResponse } from "next/server";
import { setReceiverWithdrawn } from "@/lib/db";

type Body = {
  ricevente?: string;
  piattaforma?: string;
  ritirato?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const ricevente = body.ricevente?.trim() ?? "";
    const piattaforma = body.piattaforma?.trim().toUpperCase() ?? "";
    if (!ricevente || !piattaforma || typeof body.ritirato !== "boolean") {
      return NextResponse.json(
        { error: "Parametri non validi. Usa: ricevente, piattaforma, ritirato." },
        { status: 400 },
      );
    }

    await setReceiverWithdrawn(ricevente, piattaforma, body.ritirato);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore aggiornamento ritiro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
