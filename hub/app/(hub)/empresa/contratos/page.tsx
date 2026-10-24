"use client";

import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import { buscarModelos, salvarModelo } from "@/lib/contratos";

const CAMPOS = [
  "CONTRATANTE_NOME", "CONTRATANTE_DOC", "CONTRATANTE_ENDERECO", "REPRESENTANTE", "REPRESENTANTE_CARGO", "REPRESENTANTE_CPF", "LOJAS",
  "PLANO", "MESES", "MESES_EXTENSO", "INICIO", "FIM", "VALOR", "VALOR_EXTENSO", "PAGAMENTO_DATA", "FORMA_PAGAMENTO", "DATA_CONTRATO",
];

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
  useEffect(() => { setTitulo(atual?.titulo ?? ""); setTexto(atual?.texto ?? ""); setAprovado(atual?.aprovado ?? false); setMsg(""); }, [planoId, atual?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
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
          {atual && <p className="ajuda" style={{ marginTop: 0 }}>Última edição: {dataHora(atual.updated_at)}{atual.updated_by ? ` · ${atual.updated_by}` : ""}</p>}
          <label className="rotulo" style={{ marginTop: 0 }}>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Contrato Mentoria Loja Magnética · Plano Premium" />
          <label className="rotulo">Texto do contrato</label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={30} style={{ fontSize: 13.5, lineHeight: 1.5 }} />
          <details className="mt">
            <summary style={{ cursor: "pointer" }}><b>Campos que o Hub preenche sozinho</b></summary>
            <p className="ajuda">Escreva no texto exatamente assim, com chaves duplas: {CAMPOS.map((k) => `{{${k}}}`).join(" · ")}</p>
            <p className="ajuda">Blocos opcionais: o que estiver entre [[BONUS]] e [[/BONUS]] só entra quando o Comercial marcou o bônus; entre [[GARANTIA]] e [[/GARANTIA]], só com a garantia de risco zero.</p>
          </details>
          <label className="marcar mt"><input type="checkbox" checked={aprovado} onChange={(e) => setAprovado(e.target.checked)} /> Modelo aprovado pela Camilla</label>
          {msg && <div className="aviso ok mt">{msg}</div>}
          <div className="linha mt">
            <button type="button" className="btn p" onClick={async () => { await salvarModelo({ plano_id: planoId, titulo: titulo || "Contrato", texto, aprovado }, nome); setMsg("Modelo salvo."); recarregar(); }}>Salvar modelo</button>
          </div>
        </div>
      )}
    </>
  );
}
