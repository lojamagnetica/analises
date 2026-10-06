import { NextResponse } from "next/server";
import { sincronizarAgenda } from "@/lib/agenda";

export const maxDuration = 60;

// Chamado pela Vercel todo dia às 07h05 (Recife). A Vercel envia "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await sincronizarAgenda());
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
