import { NextResponse } from "next/server";
import { deleteBonusRow } from "@/lib/sheets";

type DeleteBody = {
  rowNumber?: number;
};

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DeleteBody;
    const rowNumber = body.rowNumber;

    if (
      typeof rowNumber !== "number" ||
      !Number.isInteger(rowNumber) ||
      rowNumber < 2
    ) {
      return NextResponse.json(
        { error: "Parametro non valido: rowNumber (intero >= 2)." },
        { status: 400 },
      );
    }

    await deleteBonusRow(rowNumber);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'eliminazione della riga.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
