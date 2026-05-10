import { NextResponse } from "next/server";
import { updateCellValue } from "@/lib/sheets";

type UpdateBody = {
  row?: number;
  col?: number | string;
  value?: string;
};

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as UpdateBody;
    if (!body.row || !body.col || typeof body.value !== "string") {
      return NextResponse.json(
        { error: "Parametri non validi. Usa: row, col, value." },
        { status: 400 },
      );
    }

    await updateCellValue(body.row, body.col, body.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante l'aggiornamento della cella.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
