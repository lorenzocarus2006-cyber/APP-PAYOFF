import { NextResponse } from "next/server";
import { readAffiliatesData, readBonusRows } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get("dataset");

    if (dataset === "affiliati") {
      const data = await readAffiliatesData();
      return NextResponse.json(data);
    }

    // Home/Persona: og vede tutti i bonus (invariato), salvo solo quelli da oggi in poi.
    const rows = await readBonusRows(role === "og" ? "all" : "current");
    return NextResponse.json({ rows });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Errore durante la lettura del foglio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
