import { NextResponse } from "next/server";
import { upsertReceiverMeta } from "@/lib/db";

type Body = {
  ricevente?: string;
  piattaforma?: string;
  maxed?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const ricevente = body.ricevente?.trim() ?? "";
    const piattaforma = body.piattaforma?.trim().toUpperCase() ?? "";
    if (!ricevente || !piattaforma) {
      return NextResponse.json(
        { error: "Parametri non validi. Usa: ricevente, piattaforma." },
        { status: 400 },
      );
    }
    if (body.maxed === undefined) {
      return NextResponse.json({ error: "Specifica maxed." }, { status: 400 });
    }

    await upsertReceiverMeta({
      piattaforma,
      ricevente,
      maxed: body.maxed,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore aggiornamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
