import { NextResponse } from "next/server";
import { insertReminder } from "@/lib/db";
import { getRole } from "@/lib/role";
import type { NewReminderPayload } from "@/lib/types";

type Body = {
  bonusId?: number | null;
  leadId?: number | null;
  dataPromemoria?: string;
  descrizione?: string;
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const payload: NewReminderPayload = {
      bonusId: typeof body.bonusId === "number" ? body.bonusId : null,
      leadId: typeof body.leadId === "number" ? body.leadId : null,
      dataPromemoria: body.dataPromemoria?.trim() ?? "",
      descrizione: body.descrizione?.trim() ?? "",
    };

    if (!payload.dataPromemoria || !payload.descrizione) {
      return NextResponse.json(
        { error: "Data e descrizione sono obbligatorie." },
        { status: 400 },
      );
    }

    const reminder = await insertReminder(payload);
    return NextResponse.json({ reminder });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il salvataggio del promemoria.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
