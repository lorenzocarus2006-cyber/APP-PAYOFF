import { NextResponse } from "next/server";
import { insertLiquiditaMovimento, prelievoRiferimento } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  piattaforma?: string;
  ricevente?: string;
  importo?: number;
  nota?: string;
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const piattaforma = body.piattaforma?.trim().toUpperCase() ?? "";
    const ricevente = body.ricevente?.trim() ?? "";
    const importo = Number(body.importo);
    const nota = body.nota?.trim() ?? "";

    if (!piattaforma || !ricevente) {
      return NextResponse.json(
        { error: "Piattaforma e ricevente obbligatori." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(importo) || importo <= 0) {
      return NextResponse.json({ error: "Importo non valido." }, { status: 400 });
    }

    await insertLiquiditaMovimento({
      tipo: "prelievo",
      importo,
      descrizione: nota || `Prelievo ${piattaforma} · ${ricevente}`,
      riferimento: prelievoRiferimento(piattaforma, ricevente),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante il salvataggio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
