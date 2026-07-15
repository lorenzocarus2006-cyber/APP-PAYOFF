import { NextResponse } from "next/server";
import { deleteLead, updateLead } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  nome?: string;
  telefono?: string;
  descrizione?: string;
  bonusInteresse?: string[];
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Id non valido." }, { status: 400 });
    }

    const body = (await request.json()) as Body;
    const nome = body.nome?.trim() ?? "";
    if (!nome) {
      return NextResponse.json({ error: "Nome e cognome obbligatorio." }, { status: 400 });
    }

    const lead = await updateLead(id, {
      nome,
      telefono: body.telefono?.trim() ?? "",
      descrizione: body.descrizione?.trim() ?? "",
      bonusInteresse: Array.isArray(body.bonusInteresse) ? body.bonusInteresse : [],
    });

    return NextResponse.json({ lead });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'aggiornamento del lead.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Id non valido." }, { status: 400 });
    }

    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'eliminazione del lead.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
