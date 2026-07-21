import { NextResponse } from "next/server";
import { readReminders } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET() {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const reminders = await readReminders();
    return NextResponse.json({ reminders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante la lettura dei promemoria.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
