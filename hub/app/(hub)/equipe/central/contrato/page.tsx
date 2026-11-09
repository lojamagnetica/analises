"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataHora, hoje } from "@/lib/formato";
import { buscarJornada, marcarCheck } from "@/lib/jornada";
import { baixarPdf, buscarGerados, buscarModelos, camposDoContrato, preencher, registrarContrato } from "@/lib/contratos";

// Gera o contrato da cliente a partir do modelo do plano e dos dados da passagem do Comercial.
function GerarContrato() {
  const id = useSearchParams().get("id") ?? "";
  const { nome } = useEquipe();
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [j, m, g] = await Promise.all([buscarJornada(id), buscarModelos(), buscarGerados(id)]);
    return { c: j[0] ?? null, ...m, gerados: g };
  }, [id]);
  const c = dados?.c ?? null;
  const modelo = dados && c ? dados.modelos.find((m) => m.plano_id === c.plano) ?? null : null;
  const plano = dados && c ? dados.planos.find((p) => p.id === c.plano) ?? null : null;
  const preenchido = c?.passagem && modelo && plano
    ? (() => { const r = camposDoContrato({ passagem: c.passagem!, loja: c.loja, meses: plano.meses ?? 6, planoNome: plano.nome, hoje: hoje() }); return { ...r, texto: preencher(modelo.texto, r.campos, { BONUS: c.passagem!.bonus, GARANTIA: c.passagem!.garantia }) }; })()
    : null;
  useEffect(() => { if (preenchido) setTexto(preenchido.texto); }, [preenchido?.texto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados) return <Carregando />;
  if (!c) return <div className="card">Cliente não encontrada.</div>;
  const voltar = { href: `/equipe/central/cliente?id=${c.id}`, rotulo: c.loja };
  if (!c.passagem) return (<><Titulo voltar={voltar} titulo="Gerar contrato" /><div className="card">Esta cliente não tem a passagem do Comercial no Hub. O contrato sai dos dados da venda. <Link className="btn p peq" href={`/equipe/comercial/venda?portal=${c.id}`}>Registrar a passagem</Link></div></>);
  if (!modelo || !plano) return (<><Titulo voltar={voltar} titulo="Gerar contrato" /><div className="card">Não há modelo de contrato para este plano. Cadastre em <Link href="/empresa/contratos">Empresa › Modelos de contrato</Link>.</div></>);
  const titulo = `Contrato ${plano.nome} · ${c.loja}`;
  // Baixa o PDF e registra o contrato gerado no checklist da cliente.
  const baixar = async (arquivo: () => Promise<void>) => {
    try {
      await arquivo();
      await registrarContrato(c.id, c.plano, texto, nome);
      await marcarCheck(c.id, "contrato", { feito: true }, nome);
      recarregar();
      setMsg("Contrato baixado e marcado como gerado no checklist. Agora é só subir no Autentique e mandar para a assinatura.");
    } catch (e) { alert(`Não deu para baixar: ${(e as Error).message}`); }
  };

  return (
    <>
      <Titulo voltar={voltar} titulo="Gerar contrato" sub={`${modelo.titulo} · preenchido com os dados da venda. Confira, ajuste se precisar e baixe para mandar para assinatura.`} />
      {!modelo.aprovado && <div className="aviso mb">Este modelo ainda não foi revisado e aprovado em Modelos de contrato. Confira antes de enviar.</div>}
      {preenchido && preenchido.faltam.length > 0 && (
        <div className="aviso mb">Faltam dados da venda: {preenchido.faltam.join(", ")}. No texto eles aparecem como [PREENCHER]. Complete aqui ou peça ao Comercial.</div>
      )}
      {msg && <div className="aviso ok mb">{msg}</div>}
      <div className="card mb">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={28} style={{ fontFamily: "inherit", fontSize: 14, lineHeight: 1.5 }} />
      </div>
      <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn p" onClick={() => baixar(() => baixarPdf(titulo, texto))}>Baixar em PDF e marcar como gerado</button>
        <Copiar texto={texto} rotulo="Copiar o texto" />
      </div>
      {/[\[]PREENCHER/.test(texto) && <p className="ajuda mt">Ainda há campos [PREENCHER] no texto.</p>}
      {dados.gerados.length > 0 && (
        <div className="card mt">
          <h3 style={{ margin: "0 0 6px" }}>Contratos já gerados</h3>
          <p className="ajuda" style={{ marginTop: 0 }}>O texto de cada contrato gerado fica guardado. Baixe de novo em PDF quando precisar.</p>
          {dados.gerados.map((g) => (
            <div key={g.id} className="linha entre" style={{ gap: 8, padding: "8px 0", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
              <span>{dataHora(g.created_at)}{g.gerado_por ? ` · ${g.gerado_por}` : ""}{g.status ? ` · ${g.status.toLowerCase()}` : ""}</span>
              <button type="button" className="btn s peq" onClick={() => baixarPdf(`${titulo} · ${g.created_at.slice(0, 10)}`, g.texto).catch((e) => alert(`Não deu para baixar: ${(e as Error).message}`))}>Baixar em PDF</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><GerarContrato /></Suspense>;
}
