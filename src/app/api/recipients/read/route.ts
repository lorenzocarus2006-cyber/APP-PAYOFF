import { NextResponse } from "next/server";
import { readRecipients } from "@/lib/db";

export async function GET() {
  try {
    const recipients = await readRecipients();
    return NextResponse.json({ recipients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore lettura riceventi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
