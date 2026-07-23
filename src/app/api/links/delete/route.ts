import { NextResponse } from "next/server";
import { deleteLink } from "@/lib/db";
import { getRole } from "@/lib/role";

type Body = {
  id?: number;
};

export async function DELETE(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const body = (await request.json()) as Body;
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Id link non valido." }, { status: 400 });
    }

    const deletedLink = await deleteLink(id);
    return NextResponse.json({ deletedLink });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante l'eliminazione del link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
