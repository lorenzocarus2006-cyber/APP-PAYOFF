import { NextResponse } from "next/server";
import { readBonusRows, readLinks } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ricevente = searchParams.get("ricevente");
    if (!ricevente) return NextResponse.json({ error: "Ricevente mancante." }, { status: 400 });

    const wantsStorico = searchParams.get("scope") === "storico";
    if (wantsStorico && role !== "og") {
      return NextResponse.json(
        { error: "Non hai i permessi per vedere lo storico." },
        { status: 403 },
      );
    }

    const scope = wantsStorico ? "storico" : role === "og" ? "all" : "current";
    const [bonuses, links] = await Promise.all([readBonusRows(scope), readLinks()]);

    const target = ricevente.trim().toLowerCase();
    const rows = bonuses
      .filter((row) => row.ricevente.trim().toLowerCase() === target)
      .map((row) => {
        const link = links.find(
          (l) =>
            l.piattaforma.trim().toUpperCase() === row.piattaforma.trim().toUpperCase() &&
            l.intestatario.trim().toLowerCase() === target,
        );
        return { ...row, url: link?.url ?? null };
      });

    return NextResponse.json({ rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante la lettura dei bonus.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
