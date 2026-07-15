import { NextResponse } from "next/server";
import { readLinks } from "@/lib/db";
import { getRole } from "@/lib/role";

export async function GET(request: Request) {
  try {
    const role = await getRole();
    if (!role) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const piattaforma = searchParams.get("piattaforma") ?? undefined;

    const links = await readLinks(piattaforma);
    return NextResponse.json({ links });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore durante la lettura dei link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
