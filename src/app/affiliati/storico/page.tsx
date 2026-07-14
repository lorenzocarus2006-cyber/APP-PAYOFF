import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import StoricoClient from "./StoricoClient";

export const dynamic = "force-dynamic";

export default async function AffiliatiStoricoPage() {
  const role = await getRole();
  if (role !== "og") redirect("/affiliati");

  return <StoricoClient />;
}
