import { NextResponse } from "next/server";
import { readAffiliatesData, readBonusRows } from "@/lib/sheets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset");

    if (dataset === "affiliati") {
      const data = await readAffiliatesData();
      return NextResponse.json(data);
    }

    const rows = await readBonusRows();
    return NextResponse.json({ rows });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la lettura del foglio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
