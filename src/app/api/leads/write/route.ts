import { NextResponse } from "next/server";
import { insertLead } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  nome?: string;
  telefono?: string;
  descrizione?: string;
  bonusInteresse?: string[];
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const nome = body.nome?.trim() ?? "";
    if (!nome) {
      return NextResponse.json({ error: "Nome e cognome obbligatorio." }, { status: 400 });
    }

    const lead = await insertLead({
      nome,
      telefono: body.telefono?.trim() ?? "",
      descrizione: body.descrizione?.trim() ?? "",
      bonusInteresse: Array.isArray(body.bonusInteresse) ? body.bonusInteresse : [],
    });

    return NextResponse.json({ lead });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il salvataggio del lead.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
