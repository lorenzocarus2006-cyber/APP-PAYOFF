import { NextResponse } from "next/server";
import { appendValues, getAffiliatesPaymentsRange } from "@/lib/sheets";

type Body = {
  affiliato?: string;
  importo?: number;
  data?: string;
  modalita?: string;
  note?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const affiliato = body.affiliato?.trim() ?? "";
    if (!affiliato) {
      return NextResponse.json(
        { error: "Affiliato obbligatorio per registrare un pagamento." },
        { status: 400 },
      );
    }

    const row = [
      affiliato,
      Number(body.importo ?? 0),
      body.data?.trim() ?? "",
      body.modalita?.trim() ?? "",
      body.note?.trim() ?? "",
    ];

    console.log("[POST /api/affiliati/write] row A->E", row);
    await appendValues(row, {
      range: getAffiliatesPaymentsRange(),
      insertDataOption: "INSERT_ROWS",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante il salvataggio pagamento affiliato.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
