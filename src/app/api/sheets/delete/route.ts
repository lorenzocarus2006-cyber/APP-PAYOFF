import { NextResponse } from "next/server";
import { deleteBonus } from "@/lib/db";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "id non valido" }, { status: 400 });
    }

    await deleteBonus(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    console.error("[DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
