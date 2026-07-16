import { NextResponse } from "next/server";
import { readCustomPlatforms } from "@/lib/db";
import { mergePlatforms } from "@/config/platforms";

export async function GET() {
  try {
    const custom = await readCustomPlatforms();
    return NextResponse.json({ platforms: mergePlatforms(custom) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore lettura piattaforme.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
