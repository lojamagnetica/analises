"use client";

import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { buscarModelos, buscarVersoes, diferencas, salvarModelo, type VersaoModelo } from "@/lib/contratos";

const CAMPOS = [
  "CONTRATANTE_NOME", "CONTRATANTE_DOC", "CONTRATANTE_ENDERECO", "REPRESENTANTE", "REPRESENTANTE_CARGO", "REPRESENTANTE_CPF", "LOJAS",
  "PLANO", "MESES", "MESES_EXTENSO", "INICIO", "FIM", "VALOR", "VALOR_EXTENSO", "PAGAMENTO_DATA", "FORMA_PAGAMENTO", "DATA_CONTRATO",
];

/** O que mudou nesta versão em relação à anterior (só as linhas mexidas, com um pouco de contexto). */
function Mudancas({ antes, depois }: { antes: VersaoModelo; depois: VersaoModelo }) {
  const linhas = diferencas(antes.texto ?? "", depois.texto ?? "");
  const perto = new Set<number>();
  linhas.forEach((l, i) => { if (l.tipo !== "igual") for (let k = i - 1; k <= i + 1; k++) perto.add(k); });
  return (
    <div className="mt" style={{ fontSize: 13, lineHeight: 1.5, background: "var(--bg)", padding: 10, borderRadius: 8, whiteSpace: "pre-wrap" }}>
      {antes.titulo !== depois.titulo && <p style={{ margin: "0 0 8px" }}><b>Título:</b> <s>{antes.titulo}</s> → {depois.titulo}</p>}
      {antes.aprovado !== depois.aprovado && <p style={{ margin: "0 0 8px" }}><b>Aprovação:</b> {depois.aprovado ? "passou a aprovado" : "deixou de estar aprovado"}</p>}
      {!linhas.some((l) => l.tipo !== "igual") && <p className="mudo" style={{ margin: 0 }}>O texto não mudou.</p>}
      {linhas.map((l, i) => !perto.has(i) ? (perto.has(i - 1) ? <div key={i} className="mudo">…</div> : null) : (
        <div key={i} style={l.tipo === "tirou" ? { background: "rgba(220,60,60,.12)", textDecoration: "line-through" } : l.tipo === "incluiu" ? { background: "rgba(40,160,90,.15)" } : { opacity: 0.6 }}>
          {l.tipo === "tirou" ? "− " : l.tipo === "incluiu" ? "+ " : "  "}{l.linha || " "}
        </div>
      ))}
    </div>
  );
}

/** Histórico do modelo: toda alteração fica guardada; dá para ver o que mudou e voltar para uma versão. */
function Historico({ planoId, voltar, mudou }: { planoId: string; voltar: (v: VersaoModelo) => Promise<void>; mudou: string }) {
  const { dados: versoes } = useDados(() => buscarVersoes(planoId), [planoId, mudou]);
  const [aberta, setAberta] = useState<number | null>(null);
  if (!versoes) return null;
  return (
    <div className="card mt">
      <h3 style={{ margin: "0 0 4px" }}>Histórico de alterações</h3>
      <p className="ajuda" style={{ marginTop: 0 }}>Toda alteração fica guardada aqui e vira um alerta para a Camilla e a Claudia. O histórico começou em 07/11/2026; antes disso só existe a versão que estava valendo.</p>
      {versoes.map((v, i) => {
        const anterior = versoes[i + 1];
        return (
          <div key={v.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
              <span><b>{dataHora(v.created_at)}</b> · {v.acao.startsWith("versão") ? `${v.acao} (última edição: ${v.por_nome ?? "sem nome"})` : `${v.por_nome ?? "Alguém"} ${v.acao}`}{i === 0 && <span className="selo feito" style={{ marginLeft: 6 }}>em uso</span>}</span>
              <span className="linha" style={{ gap: 10 }}>
                {anterior && <button type="button" className="link-loja" onClick={() => setAberta(aberta === v.id ? null : v.id)}>{aberta === v.id ? "Fechar" : "Ver o que mudou"}</button>}
                {i > 0 && v.texto != null && <button type="button" className="link-loja" onClick={() => voltar(v)}>Voltar para esta versão</button>}
              </span>
            </div>
            {aberta === v.id && anterior && <Mudancas antes={anterior} depois={v} />}
          </div>
        );
      })}
    </div>
  );
}

// Modelos de contrato por plano. A Claudia gera o contrato de cada cliente a partir daqui (Central do Cliente).
export default function ModelosContrato() {
  const { nome } = useEquipe();
  const [planoId, setPlanoId] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [aprovado, setAprovado] = useState(false);
  const [msg, setMsg] = useState("");
  const { dados, recarregar } = useDados(() => buscarModelos(), []);
  const atual = dados?.modelos.find((m) => m.plano_id === planoId) ?? null;
  useEffect(() => { setMsg(""); }, [planoId]);
  // Link do alerta abre direto no plano (?plano=start).
  useEffect(() => { const p = new URLSearchParams(window.location.search).get("plano"); if (p) setPlanoId(p); }, []);
  const salvar = async (m: { titulo: string; texto: string; aprovado: boolean }, ok: string) => {
    try { await salvarModelo({ plano_id: planoId, ...m }, nome); setMsg(ok); recarregar(); }
    catch (e) { setMsg(""); alert(`Não deu para salvar: ${(e as Error).message}`); }
  };
  useEffect(() => { setTitulo(atual?.titulo ?? ""); setTexto(atual?.texto ?? ""); setAprovado(atual?.aprovado ?? false); }, [planoId, atual?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dados) return <Carregando />;
  const planos = dados.planos.filter((p) => p.vendendo);

  return (
    <>
      <Titulo titulo="Modelos de contrato" sub="Um contrato padrão por plano. A Claudia gera o contrato de cada cliente na Central do Cliente, já preenchido com os dados da venda." />
      <div className="chips mb">
        {planos.map((p) => {
          const m = dados.modelos.find((x) => x.plano_id === p.id);
          return (
            <button key={p.id} type="button" className={`chip ${planoId === p.id ? "escolhido" : ""}`} onClick={() => setPlanoId(p.id)}>
              {p.nome} {m ? (m.aprovado ? "· aprovado" : "· para revisar") : "· sem modelo"}
            </button>
          );
        })}
      </div>
      {!planoId && <p className="mudo">Escolha um plano para ver ou editar o modelo.</p>}
      {planoId && (
        <div className="card">
          {atual && <p className="ajuda" style={{ marginTop: 0 }}>{atual.aprovado ? "Aprovado" : "Última edição"}: {dataHora(atual.updated_at)}{atual.updated_by ? ` · ${atual.updated_by}` : ""}</p>}
          <label className="rotulo" style={{ marginTop: 0 }}>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Contrato Mentoria Loja Magnética · Plano Premium" />
          <label className="rotulo">Texto do contrato</label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={30} style={{ fontSize: 13.5, lineHeight: 1.5 }} />
          <details className="mt">
            <summary style={{ cursor: "pointer" }}><b>Campos que o Hub preenche sozinho</b></summary>
            <p className="ajuda">Escreva no texto exatamente assim, com chaves duplas: {CAMPOS.map((k) => `{{${k}}}`).join(" · ")}</p>
            <p className="ajuda">Blocos opcionais: o que estiver entre [[BONUS]] e [[/BONUS]] só entra quando o Comercial marcou o bônus; entre [[GARANTIA]] e [[/GARANTIA]], só com a garantia de risco zero.</p>
          </details>
          <label className="marcar mt"><input type="checkbox" checked={aprovado} onChange={(e) => setAprovado(e.target.checked)} /> Modelo revisado e aprovado (pronto para usar)</label>
          {msg && <div className="aviso ok mt">{msg}</div>}
          <div className="linha mt">
            <button type="button" className="btn p" onClick={() => salvar({ titulo: titulo || "Contrato", texto, aprovado }, "Modelo salvo. A Camilla e a Claudia recebem o alerta da alteração.")}>Salvar modelo</button>
          </div>
        </div>
      )}
      {planoId && atual && (
        <Historico planoId={planoId} mudou={atual.updated_at} voltar={async (v) => {
          if (!confirm(`Voltar o modelo para a versão de ${dataHora(v.created_at)} (${v.por_nome ?? "alguém"})? A versão atual continua guardada no histórico.`)) return;
          await salvar({ titulo: v.titulo ?? "Contrato", texto: v.texto ?? "", aprovado: false }, "Modelo voltou para a versão escolhida e ficou para revisar. Confira e marque como aprovado.");
        }} />
      )}
    </>
  );
}
