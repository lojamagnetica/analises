"use client";

import Link from "next/link";
import { useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { DIAS_NOME, FUNCOES, alertas, buscarHoje, salvarBussola, type Bussola as DadosBussola } from "@/lib/bussola";

const COR = { alerta: "var(--red)", atencao: "var(--orange)" } as const;

export default function Bussola() {
  const { portal } = usePortal();
  const { dados } = useDados(() => buscarHoje(portal.id), [portal.id]);
  const [feitos, setFeitos] = useState<DadosBussola["feitos"] | null>(null);
  const [erro, setErro] = useState("");
  const [dispensados, setDispensados] = useState<string[]>([]);
  if (!dados) return <Carregando />;
  const h = hoje();
  const diaSemana = new Date(`${h}T12:00:00Z`).getUTCDay();
  const feitosAgora = feitos ?? dados.b.feitos;
  const deHoje = dados.b.blocos.filter((b) => b.dia === diaSemana).sort((a, b) => a.hora.localeCompare(b.hora));
  const feitosHoje = feitosAgora[h] ?? [];
  const avisos = alertas(dados).filter((a) => !dispensados.includes(a.chave));

  async function marcar(id: string, feito: boolean) {
    const novo = { ...feitosAgora, [h]: feito ? [...new Set([...feitosHoje, id])] : feitosHoje.filter((x) => x !== id) };
    setFeitos(novo); setErro("");
    try { await salvarBussola(portal.id, { ...dados!.b, feitos: novo }); } catch (e) { setErro((e as Error).message); }
  }

  return (
    <>
      <Titulo titulo="Onde está o meu tempo" sub={`Sua bússola de hoje, ${DIAS_NOME[diaSemana].toLowerCase()}: o que fazer agora e o que os números estão pedindo.`} aba="Bússola do gestor" />
      <AbasBussola />
      {erro && <div className="aviso erro mb">{erro}</div>}

      <div className="secao">O que os números pedem</div>
      {avisos.length === 0 ? (
        <div className="card mb"><p style={{ margin: 0 }}>Nenhum alerta agora. Lance o caixa por vendedora, o estoque parado e os boletos para a Bússola avisar você.</p></div>
      ) : avisos.map((a) => (
        <div key={a.chave} className="card card-borda mb" style={{ ["--c" as string]: COR[a.nivel] }}>
          <div className="linha entre">
            <b>{a.titulo}</b>
            <button type="button" className="link-loja" onClick={() => setDispensados([...dispensados, a.chave])}>Ocultar hoje</button>
          </div>
          <p style={{ margin: "6px 0" }}>{a.texto}</p>
          {a.href && <Link className="btn s peq" href={a.href}>{a.botao ?? "Abrir"}</Link>}
        </div>
      ))}

      <div className="secao">Sua rotina de hoje</div>
      {dados.b.blocos.length === 0 ? (
        <div className="card mb">
          <p style={{ marginTop: 0 }}>Você ainda não montou sua rotina. Conte quando você está disponível e eu monto a semana ideal.</p>
          <Link className="btn p peq" href="/bussola/rotina">Montar minha rotina</Link>
        </div>
      ) : deHoje.length === 0 ? (
        <div className="card mb"><p style={{ margin: 0 }}>Hoje não tem nenhum bloco na sua rotina. <Link href="/bussola/rotina">Ver a semana</Link></p></div>
      ) : (
        <div className="card mb">
          {deHoje.map((b) => {
            const f = FUNCOES.find((x) => x.id === b.funcao);
            const feito = feitosHoje.includes(b.id);
            return (
              <div key={b.id} className="linha entre" style={{ gap: 10, padding: "6px 0", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: feito ? "line-through" : undefined }}>
                  <input type="checkbox" checked={feito} onChange={(e) => marcar(b.id, e.target.checked)} />
                  <span><b>{b.hora}</b> · {b.titulo} <small className="mudo">({b.minutos} min)</small></span>
                </label>
                {f?.link && <Link className="link-loja" href={f.link}>Abrir</Link>}
              </div>
            );
          })}
        </div>
      )}

      <div className="grade g3">
        <Link href="/gestao/tempo" className="card"><b>Tirar tudo da cabeça</b><p className="mudo" style={{ margin: "4px 0 0" }}>Separe o que só você faz do que pode passar para alguém.</p></Link>
        <Link href="/gestao/caixa" className="card"><b>Fechar o caixa</b><p className="mudo" style={{ margin: "4px 0 0" }}>Por vendedora, para a Bússola enxergar quedas.</p></Link>
        <Link href="/inicio" className="card"><b>Meu dia</b><p className="mudo" style={{ margin: "4px 0 0" }}>Placar, time e atitudes de atração no Início.</p></Link>
      </div>
    </>
  );
}
