import Link from "next/link";
import { Menu } from "@/components/Menu";
import { Ferramentas } from "@/components/Ferramentas";
import { contexto, personalizacao } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { ETAPAS } from "@/lib/conteudo";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contexto();
  const supabase = await supabaseServer();
  if (!ctx.equipe) await supabase.rpc("registrar_acesso");

  let persFaltam = 0;
  if (ctx.portal) {
    const pers = await personalizacao(ctx.portal.id);
    persFaltam = ETAPAS.filter((e) => !pers.get(e.numero)?.concluida).length;
  }

  return (
    <div className="app">
      <Menu equipe={ctx.equipe} temPortal={!!ctx.portal} persFaltam={persFaltam} nome={ctx.nome} email={ctx.email} />
      <div className="main">
        {ctx.equipe && ctx.portal ? (
          <div className="faixa equipe">
            Você está vendo o portal de {ctx.portal.loja} como equipe
            <Link href="/equipe">Trocar portal →</Link>
          </div>
        ) : !ctx.equipe && persFaltam > 0 ? (
          <div className="faixa">
            Termine a sua Personalização · falta {persFaltam} de {ETAPAS.length}
            <Link href="/personalizacao">Terminar agora →</Link>
          </div>
        ) : null}
        <Ferramentas temPortal={!!ctx.portal} />
        <main className="conteudo">{children}</main>
      </div>
    </div>
  );
}
