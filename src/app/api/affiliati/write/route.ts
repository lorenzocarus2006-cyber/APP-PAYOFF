import { NextResponse } from "next/server";
import { insertAffiliatePayment } from "@/lib/db";

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

    await insertAffiliatePayment({
      affiliato,
      importo: Number(body.importo ?? 0),
      data: body.data?.trim() ?? "",
      modalita: body.modalita?.trim() ?? "",
      note: body.note?.trim() ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il salvataggio pagamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
