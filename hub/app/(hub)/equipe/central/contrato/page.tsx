"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { buscarJornada, marcarCheck } from "@/lib/jornada";
import { baixarDoc, buscarModelos, camposDoContrato, preencher, registrarContrato } from "@/lib/contratos";

// Gera o contrato da cliente a partir do modelo do plano e dos dados da passagem do Comercial.
function GerarContrato() {
  const id = useSearchParams().get("id") ?? "";
  const { nome } = useEquipe();
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const { dados } = useDados(async () => {
    const [j, m] = await Promise.all([buscarJornada(id), buscarModelos()]);
    return { c: j[0] ?? null, ...m };
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
  if (!c.passagem) return (<><Titulo voltar={voltar} titulo="Gerar contrato" /><div className="card">Esta cliente não tem a passagem do Comercial no Hub. O contrato sai dos dados da venda: registre em Comercial › Nova venda (clientes novas) ou gere fora do Hub.</div></>);
  if (!modelo || !plano) return (<><Titulo voltar={voltar} titulo="Gerar contrato" /><div className="card">Não há modelo de contrato para este plano. Cadastre em <Link href="/empresa/contratos">Empresa › Modelos de contrato</Link>.</div></>);
  const titulo = `Contrato ${plano.nome} · ${c.loja}`;

  return (
    <>
      <Titulo voltar={voltar} titulo="Gerar contrato" sub={`${modelo.titulo} · preenchido com os dados da venda. Confira, ajuste se precisar e baixe para mandar para assinatura.`} />
      {!modelo.aprovado && <div className="aviso mb">Este modelo ainda não foi aprovado pela Camilla em Modelos de contrato. Confira antes de enviar.</div>}
      {preenchido && preenchido.faltam.length > 0 && (
        <div className="aviso mb">Faltam dados da venda: {preenchido.faltam.join(", ")}. No texto eles aparecem como [PREENCHER]. Complete aqui ou peça ao Comercial.</div>
      )}
      {msg && <div className="aviso ok mb">{msg}</div>}
      <div className="card mb">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={28} style={{ fontFamily: "inherit", fontSize: 14, lineHeight: 1.5 }} />
      </div>
      <div className="linha" style={{ gap: 8 }}>
        <button type="button" className="btn p" onClick={async () => {
          baixarDoc(titulo, texto);
          await registrarContrato(c.id, c.plano, texto, nome);
          await marcarCheck(c.id, "contrato", { feito: true }, nome);
          setMsg("Contrato baixado e marcado como gerado no checklist. Agora é só subir no Autentique e mandar para a assinatura.");
        }}>Baixar em Word e marcar como gerado</button>
        <Copiar texto={texto} rotulo="Copiar o texto" />
      </div>
      {/[\[]PREENCHER/.test(texto) && <p className="ajuda mt">Ainda há campos [PREENCHER] no texto.</p>}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><GerarContrato /></Suspense>;
}
