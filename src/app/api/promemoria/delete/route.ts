import { NextResponse } from "next/server";
import { deleteReminder } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function DELETE(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id non valido" }, { status: 400 });
    }

    await deleteReminder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
