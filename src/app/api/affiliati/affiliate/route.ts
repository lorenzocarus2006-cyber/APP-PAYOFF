import { NextResponse } from "next/server";
import { deleteAffiliate, insertAffiliate, updateAffiliateRate } from "@/lib/db";

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

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { nome?: string; percentuale?: number };
    const nome = body.nome?.trim() ?? "";
    if (!nome) {
      return NextResponse.json({ error: "Nome affiliato obbligatorio." }, { status: 400 });
    }
    const percentuale = Number(body.percentuale);
    if (!Number.isFinite(percentuale)) {
      return NextResponse.json({ error: "Percentuale non valida." }, { status: 400 });
    }
    await updateAffiliateRate(nome, percentuale / 100);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore aggiornamento percentuale.";
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
