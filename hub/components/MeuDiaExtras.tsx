"use client";

// Meu dia: o que antes ficava em outras telas e agora entra aqui (novidades das lojas e o caixa do dia dos agentes).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDados } from "@/lib/hub";
import { Recolhivel } from "@/components/Recolhivel";
import { haQuanto, hoje } from "@/lib/formato";
import { somarDias } from "@/lib/acoes-mes";
import { supabaseBrowser } from "@/lib/supabase/client";
import { excluirNovidade, marcarVisto, vistoEm, type Novidade } from "@/lib/novidades";

/** O que as lojas fizeram no Hub desde ontem (história, teste de perfil, plano, etapa, pergunta). */
export function NovidadesDoDia() {
  const [visto] = useState(vistoEm);
  const { dados, recarregar } = useDados(async () => {
    const { data } = await supabaseBrowser().from("novidades").select("*").gte("created_at", new Date(`${somarDias(hoje(), -1)}T00:00:00-03:00`).toISOString()).order("created_at", { ascending: false }).limit(20);
    return (data ?? []) as Novidade[];
  }, []);
  useEffect(() => { if (dados?.length) marcarVisto(); }, [dados]);
  if (!dados || !dados.length) return null;
  return (
    <Recolhivel id="novidades" cor="var(--blue)" titulo={`O que as lojas fizeram desde ontem · ${dados.length}`} extra={<Link href="/empresa/novidades" className="mudo" style={{ fontSize: 13 }}>ver todas</Link>}>
      {dados.map((n) => {
        const nova = !visto || n.created_at > visto;
        return (
          <div key={n.id} className="linha entre" style={{ gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)", alignItems: "flex-start" }}>
            <span style={{ minWidth: 0 }}>
              {n.link ? <Link href={n.link} style={{ color: "inherit", fontWeight: nova ? 700 : 400 }}>{n.texto}</Link> : <span style={{ fontWeight: nova ? 700 : 400 }}>{n.texto}</span>}
              {" "}<small className="mudo">· {haQuanto(n.created_at)}</small>
              {n.portal_id && <> · <Link href={`/equipe/loja?id=${n.portal_id}`} style={{ fontSize: 13 }}>ficha</Link></>}
            </span>
            <button type="button" className="link-loja" style={{ fontSize: 12.5, color: "var(--red)", flexShrink: 0 }} onClick={async () => { if (!confirm("Tirar esta novidade da lista?")) return; try { await excluirNovidade(n.id); recarregar(); } catch (e) { alert((e as Error).message); } }}>Tirar</button>
          </div>
        );
      })}
    </Recolhivel>
  );
}

/** O que os agentes deixaram pronto (resumos para o grupo, respostas sugeridas, combinados delegados) e ainda está em aberto. */
export function CaixaDoDiaResumo({ soDaCs }: { soDaCs: boolean }) {
  const { dados } = useDados(async () => {
    let q = supabaseBrowser().from("caixa_dia").select("id", { count: "exact", head: true }).eq("perfil", "camilla").lte("data", hoje()).neq("status", "Feito");
    if (soDaCs) q = q.eq("delegar_para", "Claudia");
    const { count } = await q;
    return count ?? 0;
  }, [soDaCs]);
  if (!dados) return null;
  return (
    <div className="card mb linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
      <span><b>Caixa do dia</b> <span className="mudo">· {dados} {dados === 1 ? "item pronto pelos agentes" : "itens prontos pelos agentes"} em aberto (respostas sugeridas, resumos e combinados{soDaCs ? " delegados para você" : ""})</span></span>
      <Link className="btn s peq" href="/empresa/caixa-do-dia">Abrir</Link>
    </div>
  );
}
