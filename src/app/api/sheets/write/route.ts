import { NextResponse } from "next/server";
import { insertAffiliatePayment, insertBonus } from "@/lib/db";
import type { NewBonusPayload } from "@/lib/types";

type AffiliatePaymentBody = {
  dataset?: "affiliati";
  affiliato?: string;
  importo?: number;
  data?: string;
  modalita?: string;
  note?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<NewBonusPayload> & AffiliatePaymentBody;

    if (body.dataset === "affiliati") {
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
    }

    const payload: NewBonusPayload = {
      piattaforma: body.piattaforma?.trim() ?? "",
      personaInvitata: body.personaInvitata?.trim() ?? "",
      stato: body.stato?.trim() ?? "",
      ricevente: body.ricevente?.trim() ?? "",
      data: body.data?.trim() ?? "",
      info: body.info?.trim() ?? "",
      affiliati: body.affiliati?.trim() ?? "",
      bonus: Number.isFinite(Number(body.bonus)) ? Number(body.bonus) : 0,
      spese: Number.isFinite(Number(body.spese)) ? Number(body.spese) : 0,
      amazon: Number.isFinite(Number(body.amazon)) ? Number(body.amazon) : 0,
    };

    if (!payload.piattaforma || !payload.stato) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti: Piattaforma e STATO sono richiesti." },
        { status: 400 },
      );
    }

    const created = await insertBonus(payload);
    return NextResponse.json({ ok: true, row: created });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il salvataggio del bonus.";
    console.error("[POST /api/sheets/write] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
