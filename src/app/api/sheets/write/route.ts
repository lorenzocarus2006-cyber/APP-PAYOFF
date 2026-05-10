import { NextResponse } from "next/server";
import { appendBonusValues, appendValues, getAffiliatesPaymentsRange } from "@/lib/sheets";
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
    const body = (await request.json()) as Partial<NewBonusPayload> &
      AffiliatePaymentBody;

    if (body.dataset === "affiliati") {
      const row = [
        body.affiliato?.trim() ?? "",
        Number(body.importo ?? 0),
        body.data?.trim() ?? "",
        body.modalita?.trim() ?? "",
        body.note?.trim() ?? "",
      ];

      if (!row[0]) {
        return NextResponse.json(
          { error: "Affiliato obbligatorio per registrare un pagamento." },
          { status: 400 },
        );
      }

      console.log("[POST /api/sheets/write] affiliati row A->E", row);
      await appendValues(row, {
        range: getAffiliatesPaymentsRange(),
        insertDataOption: "INSERT_ROWS",
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
      bonus: Number(body.bonus ?? 0),
      spese: Number(body.spese ?? 0),
      amazon: Number(body.amazon ?? 0),
    };
    const numericBonus = Number.isFinite(payload.bonus) ? payload.bonus : 0;
    const numericSpese = Number.isFinite(payload.spese) ? payload.spese : 0;
    const numericAmazon = Number.isFinite(payload.amazon) ? payload.amazon : 0;

    if (!payload.piattaforma || !payload.stato) {
      return NextResponse.json(
        {
          error: "Campi obbligatori mancanti: Piattaforma e STATO sono richiesti.",
        },
        { status: 400 },
      );
    }

    const row = [
      payload.piattaforma, // A
      payload.personaInvitata, // B
      payload.stato, // C
      payload.ricevente || "", // D
      payload.data || "", // E
      payload.info || "", // F
      payload.affiliati || "", // G
      numericBonus, // H
      numericSpese, // I
      numericAmazon, // J
    ];

    console.log("[POST /api/sheets/write] row A->J", row);
    await appendBonusValues(row);
    console.log("[POST /api/sheets/write] append ok");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante il salvataggio del bonus.";
    console.error("[POST /api/sheets/write] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
