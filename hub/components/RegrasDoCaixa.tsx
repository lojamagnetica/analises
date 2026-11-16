"use client";

// Regras do caixa da loja: a loja diz como cada forma de pagamento ou lançamento do sistema dela conta.
import { useState } from "react";
import { useDados } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { buscarRegras, respondido, salvarRegras, type ItemRegra, type Resposta } from "@/lib/regras-caixa";

const OPCOES_FAT: [Resposta, string][] = [["sim", "Conta"], ["nao", "Não conta"], ["diferenca", "Só a diferença"]];
const OPCOES_REC: [Resposta, string][] = [["sim", "Entra"], ["nao", "Não entra"], ["diferenca", "Só a diferença"]];

function Escolha({ valor, opcoes, mudar, rotulo }: { valor: Resposta; opcoes: [Resposta, string][]; mudar: (v: Resposta) => void; rotulo: string }) {
  return (
    <div>
      <small className="mudo">{rotulo}</small>
      <div className="chips" style={{ marginTop: 2 }}>
        {opcoes.map(([v, t]) => (
          <button key={v} type="button" className={`chip${valor === v ? " escolhido" : ""}`} aria-pressed={valor === v} onClick={() => mudar(valor === v ? "" : v)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

export function RegrasDoCaixa({ portalId, nome, abertoDeInicio = false }: { portalId: string; nome: string; abertoDeInicio?: boolean }) {
  const { dados, recarregar } = useDados(() => buscarRegras(portalId), [portalId]);
  const [itens, setItens] = useState<ItemRegra[] | null>(null);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  if (!dados) return null;
  const lista = itens ?? dados.itens;
  const mudar = (i: number, x: Partial<ItemRegra>) => setItens(lista.map((it, j) => (j === i ? { ...it, ...x } : it)));
  const faltam = lista.filter((i) => !respondido(i)).length;
  const salvar = async (confirmar: boolean) => {
    setSalvando(true); setMsg("");
    try {
      await salvarRegras(portalId, lista, confirmar, nome);
      setItens(null); recarregar();
      setMsg(confirmar ? "Regras confirmadas. A partir de agora o Hub conta o seu caixa assim." : "Respostas salvas. Quando terminar, toque em Confirmar.");
    } catch (e) { setMsg((e as Error).message); }
    setSalvando(false);
  };

  return (
    <details className="card mb" open={abertoDeInicio || !dados.confirmado_em}>
      <summary style={{ cursor: "pointer" }}>
        <b>Regras do caixa da sua loja</b>{" "}
        {dados.confirmado_em ? <span className="selo feito">confirmadas em {dataHora(dados.confirmado_em)}</span> : <span className="selo espera">esperando você confirmar</span>}
      </summary>
      <p className="ajuda">
        Cada sistema tem formas de pagamento e lançamentos diferentes (vale-presente, consórcio, crédito da cliente, troca…). Diga como cada um conta na sua loja:
        se <b>conta como venda do dia</b> (faturamento) e se <b>entra no recebido do dia</b> (o dinheiro que entrou). Escreva também o nome ou a sigla que aparece no seu relatório.
        É isso que o Hub e o agente que lê os seus relatórios vão seguir. O que você não usa, marque &quot;Não uso&quot;.
      </p>
      {lista.map((it, i) => (
        <div key={it.chave} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
          <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
            {it.chave.startsWith("loja_")
              ? <input type="text" value={it.titulo} placeholder="Qual é a situação?" onChange={(e) => mudar(i, { titulo: e.target.value })} style={{ flex: "1 1 260px" }} />
              : <b>{it.titulo}</b>}
            <label className="marcar" style={{ margin: 0 }}><input type="checkbox" checked={!!it.naoUso} onChange={(e) => mudar(i, { naoUso: e.target.checked })} /><span>Não uso</span></label>
          </div>
          {it.sugestao && <small className="mudo" style={{ display: "block", marginTop: 2 }}>{it.sugestao}</small>}
          {!it.naoUso && (
            <>
              <div className="grade g2" style={{ gap: 8, marginTop: 6 }}>
                <Escolha rotulo="Conta como venda do dia (faturamento)?" valor={it.faturamento} opcoes={OPCOES_FAT} mudar={(v) => mudar(i, { faturamento: v })} />
                <Escolha rotulo="Entra no recebido do dia?" valor={it.recebido} opcoes={OPCOES_REC} mudar={(v) => mudar(i, { recebido: v })} />
              </div>
              <div className="grade g2" style={{ gap: 8, marginTop: 6 }}>
                <input type="text" value={it.nome} placeholder="Como aparece no seu relatório (ex.: V.Cré., Crédito avulso)" onChange={(e) => mudar(i, { nome: e.target.value })} />
                <input type="text" value={it.obs} placeholder="Explique (opcional)" onChange={(e) => mudar(i, { obs: e.target.value })} />
              </div>
            </>
          )}
          {it.chave.startsWith("loja_") && <button type="button" className="link-loja" onClick={() => { if (confirm("Tirar esta situação?")) setItens(lista.filter((_, j) => j !== i)); }}>Excluir</button>}
        </div>
      ))}
      <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn s peq" onClick={() => setItens([...lista, { chave: `loja_${Date.now()}`, titulo: "", faturamento: "", recebido: "", nome: "", obs: "" }])}>+ Outra situação do meu sistema</button>
        <button type="button" className="btn s peq" disabled={salvando} onClick={() => salvar(false)}>Salvar</button>
        <button type="button" className="btn p peq" disabled={salvando || faltam > 0} onClick={() => salvar(true)}>{faltam ? `Faltam ${faltam} para confirmar` : "Confirmar as regras"}</button>
      </div>
      {msg && <div className="aviso ok mt">{msg}</div>}
    </details>
  );
}
