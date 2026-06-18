import { NextResponse } from "next/server";
import { deleteAffiliate, insertAffiliate } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { nome?: string };
    const nome = body.nome?.trim() ?? "";
    if (!nome) {
      return NextResponse.json({ error: "Nome affiliato obbligatorio." }, { status: 400 });
    }
    await insertAffiliate(nome);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore creazione affiliato.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { nome?: string };
    const nome = body.nome?.trim() ?? "";
    if (!nome) {
      return NextResponse.json({ error: "Nome affiliato obbligatorio." }, { status: 400 });
    }
    await deleteAffiliate(nome);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore eliminazione affiliato.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
