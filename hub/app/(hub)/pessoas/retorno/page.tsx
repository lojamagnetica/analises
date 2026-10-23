"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import {
  FALTAS, alertasTexto, buscarMetodo, buscarPessoas, principal, retornoSalvar, roteiroCobranca, roteiroReconhecimento, type Falta,
} from "@/lib/pessoas";

function Retorno() {
  const inicial = useSearchParams().get("pessoa") ?? "";
  const { portal } = usePortal();
  const [pessoaId, setPessoaId] = useState(inicial);
  const [tipo, setTipo] = useState<"Cobrar" | "Reconhecer">("Cobrar");
  const [falta, setFalta] = useState<Falta>("Querer");
  const [c, setC] = useState({ combinado: "", aconteceu: "", impacto: "", novo: "", retorno: "", fez: "", importou: "", mostra: "" });
  const [salvo, setSalvo] = useState("");
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarPessoas(portal.id)), m: await buscarMetodo() }), [portal.id]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const PERFIS = m.perfis;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const p = ativos.find((x) => x.id === pessoaId) ?? null;
  const pr = principal(p?.perfil ?? null);
  const campo = (k: keyof typeof c, rotulo: string, ph: string, area = false) => (
    <>
      <label className="rotulo">{rotulo}</label>
      {area
        ? <textarea rows={2} value={c[k]} placeholder={ph} onChange={(e) => { setC({ ...c, [k]: e.target.value }); setSalvo(""); }} />
        : <input type="text" value={c[k]} placeholder={ph} onChange={(e) => { setC({ ...c, [k]: e.target.value }); setSalvo(""); }} />}
    </>
  );
  const pronto = tipo === "Cobrar" ? !!(c.combinado && c.aconteceu) : !!(c.fez && c.importou);
  const roteiro = !p || !pronto ? "" : tipo === "Cobrar"
    ? roteiroCobranca(m, { nome: p.nome, perfil: pr?.letra ?? null, falta, ...c })
    : roteiroReconhecimento(m, { nome: p.nome, perfil: pr?.letra ?? null, fez: c.fez, importou: c.importou, mostra: c.mostra });
  const alertas = tipo === "Cobrar" && pronto ? alertasTexto(m, c.combinado, c.aconteceu) : [];

  if (!ativos.length) {
    return (
      <>
        <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Dar retorno" />
        <div className="card">Cadastre a sua equipe primeiro. <Link href="/pessoas">Ir para Minha equipe →</Link></div>
      </>
    );
  }

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Dar retorno" sub={m.textos.retorno_sub} />
      <div className="grade g2">
        <div className="card">
          <label className="rotulo">Para quem</label>
          <select value={pessoaId} onChange={(e) => { setPessoaId(e.target.value); setSalvo(""); }}>
            <option value="">Escolha a pessoa</option>
            {ativos.map((x) => { const q = principal(x.perfil); return <option key={x.id} value={x.id}>{x.nome}{q ? ` · ${PERFIS[q.letra].nome}` : ""}</option>; })}
          </select>
          {p && !p.perfil && <p className="ajuda">Sem perfil ainda: o roteiro sai sem o ajuste de tom. <Link href={`/pessoas/teste?id=${p.id}`}>Fazer o teste</Link></p>}

          <label className="rotulo">O que você vai fazer</label>
          <div className="linha">
            {(["Cobrar", "Reconhecer"] as const).map((t) => (
              <button key={t} type="button" className={`btn peq ${tipo === t ? "p" : "s"}`} aria-pressed={tipo === t} onClick={() => { setTipo(t); setSalvo(""); }}>{t}</button>
            ))}
          </div>

          {tipo === "Cobrar" ? (
            <>
              <label className="rotulo">Antes de cobrar: o que está faltando?</label>
              {FALTAS.map((f) => (
                <label key={f} className="marcar">
                  <input type="radio" name="falta" checked={falta === f} onChange={() => { setFalta(f); setSalvo(""); }} />
                  <span><b>{f}</b>: {m.diagnostico[f].sinal} → o líder {m.diagnostico[f].lider}</span>
                </label>
              ))}
              <p className="ajuda">{m.textos.retorno_diag_nota}</p>
              {campo("combinado", "O que foi combinado", "Ex.: 10 mensagens por dia para a carteira")}
              {campo("aconteceu", "O que aconteceu (um fato, com número)", "Ex.: Essa semana foram 3")}
              {falta === "Querer" && campo("impacto", "O impacto", "Ex.: Sem esse contato, a cliente não volta e a sua meta fica mais longe")}
              {campo("novo", "Novo combinado (o quê, quanto, até quando)", "Ex.: 10 mensagens por dia até sexta")}
              {campo("retorno", "Quando vocês olham junto", "Ex.: Sexta no fim do dia")}
            </>
          ) : (
            <>
              {campo("fez", "Fez: o comportamento, específico", "Ex.: você chamou de volta aquela cliente que não comprava há 3 meses")}
              {campo("importou", "Importou: o resultado", "Ex.: Ela voltou e levou três peças")}
              {campo("mostra", "Mostra: o que isso ensina ao time", "Ex.: Isso é atenção com cliente")}
              <p className="ajuda">{m.textos.retorno_reconhecer_nota}</p>
            </>
          )}
        </div>

        <div className="card card-borda" style={{ ["--c" as string]: tipo === "Cobrar" ? "var(--orange)" : "var(--green)" }}>
          <h2>O roteiro</h2>
          {!p ? <p className="mudo">Escolha a pessoa.</p> : !pronto ? <p className="mudo">Preencha os campos e o roteiro aparece aqui.</p> : (
            <>
              {alertas.map((a) => <div key={a} className="aviso mb">{a}</div>)}
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>{roteiro}</pre>
              <div className="linha mt">
                <Copiar texto={roteiro} rotulo="Copiar roteiro" />
                <button className="btn s peq" type="button" disabled={!!salvo} onClick={async () => {
                  const situacao = tipo === "Cobrar" ? `${c.combinado} · ${c.aconteceu}` : `${c.fez} · ${c.importou}`;
                  await retornoSalvar(portal.id, p.id, tipo, situacao, roteiro);
                  setSalvo(`Registrado no histórico de ${p.nome.split(" ")[0]}.`); recarregar();
                }}>Registrar</button>
              </div>
              {salvo && <div className="aviso ok mt">{salvo}</div>}
              <p className="ajuda">{tipo === "Cobrar" ? m.textos.retorno_regra_cobrar : m.textos.retorno_regra_reconhecer}</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Retorno /></Suspense>;
}
