import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import StoricoClient from "./StoricoClient";

export const dynamic = "force-dynamic";

export default async function BilancioStoricoPage() {
  const role = await getRole();
  if (role !== "og") redirect("/bilancio");

  return <StoricoClient />;
}
