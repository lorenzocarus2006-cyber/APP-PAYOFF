import { NextResponse } from "next/server";
import { readAffiliatesData } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await readAffiliatesData();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la lettura del registro affiliati.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
