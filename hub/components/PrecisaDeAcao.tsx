"use client";

// Na Caixa do dia: tudo o que está parado esperando uma ação da Camilla ou da CS: aprovações, pedidos das lojas e fases da jornada.
import Link from "next/link";
import { useState } from "react";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta, hoje } from "@/lib/formato";
import { buscarPrecisaDeAcao, type ItemAcao } from "@/lib/precisa-acao";

const dias = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.parse(`${hoje()}T12:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T12:00:00Z`)) / 86_400_000)) : 0);

function Grupo({ titulo, itens, nome, abrir, aprova, recarregar, vazio }: { titulo: string; itens: ItemAcao[]; nome: (id: string | null) => string; abrir: (id: string, d?: string) => void; aprova: boolean; recarregar: () => void; vazio: string }) {
  const [todos, setTodos] = useState(false);
  const [erro, setErro] = useState("");
  const lista = todos ? itens : itens.slice(0, 6);
  return (
    <div className="card mb">
      <div className="linha entre"><b>{titulo}</b><span className={`selo ${itens.length ? "alerta" : "feito"}`}>{itens.length ? itens.length : "em dia"}</span></div>
      {!itens.length && <p className="mudo" style={{ margin: "6px 0 0" }}>{vazio}</p>}
      {erro && <div className="aviso mt">{erro}</div>}
      {lista.map((i) => {
        const d = dias(i.quando);
        return (
          <div key={i.chave} className="linha entre" style={{ gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ flex: "1 1 320px" }}>
              <span className="selo espera" style={{ marginRight: 6 }}>{i.tipo}</span><b>{nome(i.portal)}</b>
              <div>{i.titulo}</div>
              {(i.atrasada || d >= 3) && <small style={{ color: "var(--red)" }}>{i.atrasada ? "atrasado" : `parado há ${d} dias`}{i.quando ? ` · ${dataCurta(i.quando)}` : ""}</small>}
            </span>
            <span className="linha" style={{ gap: 6 }}>
              {i.destino && i.portal ? <button type="button" className="btn s peq" onClick={() => abrir(i.portal as string, i.destino)}>Abrir</button> : i.href && <Link className="btn s peq" href={i.href}>Abrir</Link>}
              {i.liberar && aprova && (
                <button type="button" className="btn p peq" onClick={async () => { if (!confirm(`Liberar "${i.titulo}" para ${nome(i.portal)}? A loja passa a ver.`)) return; setErro(""); try { await i.liberar!(); recarregar(); } catch (e) { setErro((e as Error).message); } }}>Liberar</button>
              )}
            </span>
          </div>
        );
      })}
      {itens.length > 6 && <button type="button" className="btn s peq mt" onClick={() => setTodos(!todos)}>{todos ? "Mostrar menos" : `Ver todos (${itens.length})`}</button>}
    </div>
  );
}

export function PrecisaDeAcao() {
  const { abrirPortal, aprova } = useEquipe();
  const { dados, recarregar } = useDados(() => buscarPrecisaDeAcao(), []);
  if (!dados) return <Carregando />;
  const nome = (id: string | null) => (id ? dados.ativos.get(id) ?? "Loja" : "Para todas as lojas");
  const total = dados.aprovar.length + dados.pedidos.length + dados.fases.length;
  return (
    <>
      <div className="secao">Precisa de ação · {total}</div>
      <p className="ajuda" style={{ marginTop: 0 }}>O que está parado esperando você ou a Claudia: aprovações, pedidos das lojas e fases da jornada. Fica aqui até ser resolvido, para nenhum mentorado ficar solto.</p>
      <Grupo titulo="Esperando aprovação" itens={dados.aprovar} nome={nome} abrir={abrirPortal} aprova={aprova} recarregar={recarregar} vazio="Nada esperando aprovação. 🎉" />
      <Grupo titulo="Pedidos das lojas (ajustes, dúvidas e avisos)" itens={dados.pedidos} nome={nome} abrir={abrirPortal} aprova={aprova} recarregar={recarregar} vazio="Nenhum pedido esperando resposta." />
      <Grupo titulo="Fases precisando de uma ação (Diagnóstico e Rota de 90 dias)" itens={dados.fases} nome={nome} abrir={abrirPortal} aprova={aprova} recarregar={recarregar} vazio="Nenhuma fase parada em uma ação da Camilla." />
    </>
  );
}
