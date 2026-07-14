import { NextResponse } from "next/server";
import { updateBonusField } from "@/lib/db";
import { getRole } from "@/lib/role";

type UpdateBody = {
  id?: number;
  field?: string;
  value?: string | number | boolean;
};

export async function PUT(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as UpdateBody;
    if (!body.id || !body.field || body.value === undefined) {
      return NextResponse.json(
        { error: "Parametri non validi. Usa: id, field, value." },
        { status: 400 },
      );
    }

    await updateBonusField(body.id, body.field, body.value, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'aggiornamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
