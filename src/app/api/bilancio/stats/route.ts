import { NextResponse } from "next/server";
import { readBilancioStats } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await readBilancioStats();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il calcolo del bilancio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
