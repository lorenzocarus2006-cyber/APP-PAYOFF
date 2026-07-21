import { NextResponse } from "next/server";
import { updateReminder } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  id?: string;
  dataPromemoria?: string;
  descrizione?: string;
  completato?: boolean;
  bonusId?: number | null;
};

export async function PUT(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    if (!body.id) {
      return NextResponse.json({ error: "id non valido." }, { status: 400 });
    }

    const reminder = await updateReminder(body.id, {
      dataPromemoria: body.dataPromemoria,
      descrizione: body.descrizione,
      completato: body.completato,
      bonusId: body.bonusId,
    });
    return NextResponse.json({ reminder });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'aggiornamento del promemoria.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
