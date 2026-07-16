import { NextResponse } from "next/server";
import { insertCustomPlatform } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  label?: string;
  bonus?: number;
  spese?: number;
  amazon?: number;
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const label = body.label?.trim() ?? "";
    if (!label) {
      return NextResponse.json({ error: "Nome piattaforma obbligatorio." }, { status: 400 });
    }

    const platform = await insertCustomPlatform({
      label,
      bonus: Number(body.bonus) || 0,
      spese: Number(body.spese) || 0,
      amazon: Number(body.amazon) || 0,
    });
    return NextResponse.json({ platform });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore creazione piattaforma.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
