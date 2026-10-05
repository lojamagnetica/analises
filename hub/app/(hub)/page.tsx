import { redirect } from "next/navigation";
import { contexto } from "@/lib/contexto";

export default async function Raiz() {
  const ctx = await contexto();
  redirect(ctx.equipe && !ctx.portal ? "/equipe" : ctx.portal ? "/inicio" : "/sem-portal");
}
