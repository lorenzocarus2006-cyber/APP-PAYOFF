import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { rowNumber?: unknown };
    const rowNumber = Number(body.rowNumber);

    if (
      body.rowNumber === undefined ||
      body.rowNumber === null ||
      !Number.isFinite(rowNumber) ||
      !Number.isInteger(rowNumber) ||
      rowNumber < 2
    ) {
      return NextResponse.json({ error: "Row number non valido" }, { status: 400 });
    }

    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "SPREADSHEET_ID non configurato" },
        { status: 500 },
      );
    }

    const sheets = await getSheetsClient();

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === "aprile");

    const sheetId = sheet?.properties?.sheetId;
    if (sheetId == null) {
      return NextResponse.json({ error: "Foglio aprile non trovato" }, { status: 404 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore eliminazione";
    console.error("[DELETE /api/sheets/delete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
