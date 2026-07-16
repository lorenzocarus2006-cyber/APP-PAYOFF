import { NextResponse } from "next/server";
import { upsertReceiverLinkValue } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  piattaforma?: string;
  intestatario?: string;
  url?: string;
};

export async function POST(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const piattaforma = body.piattaforma?.trim().toUpperCase() ?? "";
    const intestatario = body.intestatario?.trim() ?? "";
    const url = body.url?.trim() ?? "";

    if (!piattaforma || !intestatario || !url) {
      return NextResponse.json(
        { error: "Piattaforma, intestatario e link sono obbligatori." },
        { status: 400 },
      );
    }

    const link = await upsertReceiverLinkValue(piattaforma, intestatario, url);
    return NextResponse.json({ link });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante il salvataggio del link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
