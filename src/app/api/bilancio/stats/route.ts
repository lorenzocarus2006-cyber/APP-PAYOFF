import { NextResponse } from "next/server";
import { readBilancioStats } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const wantsStorico = searchParams.get("scope") === "storico";

    if (wantsStorico && role !== "og") {
      return NextResponse.json(
        { error: "Non hai i permessi per vedere lo storico." },
        { status: 403 },
      );
    }

    const data = await readBilancioStats(wantsStorico ? "storico" : "current");
    return NextResponse.json({ ...data, role });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il calcolo del bilancio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
