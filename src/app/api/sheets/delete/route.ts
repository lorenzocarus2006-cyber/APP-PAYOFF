import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const rowNumber = Number(body.rowNumber);

    if (!rowNumber || rowNumber < 2) {
      return NextResponse.json({ error: "Row number non valido" }, { status: 400 });
    }

    const spreadsheetId = process.env.SPREADSHEET_ID!;
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `aprile!A${rowNumber}:K${rowNumber}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    console.error("[DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
