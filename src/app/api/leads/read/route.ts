import { NextResponse } from "next/server";
import { readLeads } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET() {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const leads = await readLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante la lettura dei lead.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
