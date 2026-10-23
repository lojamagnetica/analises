"use client";

import Link from "next/link";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dia } from "@/lib/formato";
import { buscarAcoes, situacao, type LojaAcao } from "@/lib/acoes-mes";

export default function AcoesDoMes() {
  const { portal } = usePortal();
  const { dados } = useDados(async () => {
    const [acoes, { data: minhas }] = await Promise.all([
      buscarAcoes(),
      supabaseBrowser().from("loja_acoes").select("*").eq("portal_id", portal.id),
    ]);
    return { acoes: acoes.filter((a) => a.publicada), minhas: (minhas ?? []) as LojaAcao[] };
  }, [portal.id]);
  if (!dados) return <Carregando />;
  const ativas = dados.acoes.filter((a) => situacao(a).texto !== "encerrada");
  const passadas = dados.acoes.filter((a) => situacao(a).texto === "encerrada");

  const cartao = (a: (typeof dados.acoes)[number]) => {
    const s = situacao(a);
    const minha = dados.minhas.find((m) => m.acao_id === a.id);
    return (
      <Link key={a.id} href={`/acoes/acao?id=${a.id}`} className="card card-borda" style={{ ["--c" as string]: "var(--red)", textDecoration: "none", color: "inherit" }}>
        <div className="linha entre">
          <span className={`selo ${s.classe}`}>{s.texto}</span>
          {minha ? <span className="selo feito">{minha.concluida ? "concluída" : "ativada"}</span> : <span className="selo alerta">ainda não ativada</span>}
        </div>
        <h2 style={{ margin: "10px 0 4px" }}>{a.titulo}</h2>
        <div className="mudo" style={{ fontSize: 13.5 }}>Preparação a partir de {dia(a.inicio)} · venda {dia(a.venda_inicio ?? a.data_acao)} a {dia(a.fim)}</div>
        <p style={{ marginBottom: 0 }}>{a.resumo.split(". ").slice(0, 2).join(". ")}{a.resumo.split(". ").length > 2 ? "." : ""}</p>
      </Link>
    );
  };

  return (
    <>
      <Titulo titulo="Ações do Mês" sub="Ações de mercado validadas, prontas para a sua loja: o cronograma, as mensagens, o conteúdo, o script do time e o placar da meta." />
      {ativas.length === 0 ? (
        <div className="card">A próxima ação aparece aqui assim que a equipe Loja Magnética publicar.</div>
      ) : (
        <div className="grade g2">{ativas.map(cartao)}</div>
      )}
      {passadas.length > 0 && (
        <>
          <div className="secao">Ações anteriores</div>
          <div className="grade g2">{passadas.map(cartao)}</div>
        </>
      )}
    </>
  );
}
