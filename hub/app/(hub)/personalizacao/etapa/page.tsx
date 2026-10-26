"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { EquipeDaEtapa } from "@/components/EquipeDaEtapa";
import { Titulo } from "@/components/Titulo";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { ETAPAS, SITUACOES, chaveSituacao, type Campo, type Respostas, type Situacao } from "@/lib/conteudo";
import { salvarEtapa } from "@/lib/acoes";
import { dataCurta } from "@/lib/formato";
import { relatoriosNoDrive } from "@/lib/gestao";
import { abrirRelatorio, listarRelatorios, mensagemSuporte, subirRelatorio, tamanhoLegivel } from "@/lib/relatorios";

/** Um campo da etapa. Os dados (números, relatório) têm as 3 opções: tenho, estimativa, ainda não tenho. */
function CampoEtapa({ c, r, padrao }: { c: Campo; r: Respostas; padrao: string }) {
  const [st, setSt] = useState<Situacao>((r[chaveSituacao(c.id)] as Situacao) || "tenho");
  const valor = typeof r[c.id] === "string" ? (r[c.id] as string) : padrao;
  const lista = Array.isArray(r[c.id]) ? (r[c.id] as string[]) : [];
  const fora = st === "nao_tenho";
  return (
    <div style={{ marginBottom: 6 }}>
      <label className="rotulo" htmlFor={c.id}>{c.rotulo}</label>
      {c.tipo === "textarea" ? (
        <textarea id={c.id} name={c.id} defaultValue={valor} disabled={fora} />
      ) : c.tipo === "opcao" ? (
        <select id={c.id} name={c.id} defaultValue={valor} disabled={fora}>
          <option value="">Escolha…</option>
          {c.opcoes!.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : c.tipo === "multi" ? (
        c.opcoes!.map((o) => (
          <label key={o} className="marcar">
            <input type="checkbox" name={c.id} value={o} defaultChecked={lista.includes(o)} disabled={fora} />
            <span>{o}</span>
          </label>
        ))
      ) : (
        <input id={c.id} name={c.id} type={c.tipo === "numero" ? "number" : "text"} step="any" defaultValue={valor} disabled={fora} />
      )}
      {c.ajuda && <div className="ajuda">{c.ajuda}</div>}
      {c.dado && (
        <div className="linha" style={{ gap: 6, marginTop: 6 }} role="radiogroup" aria-label={`Situação: ${c.rotulo}`}>
          <input type="hidden" name={chaveSituacao(c.id)} value={st} />
          {SITUACOES.map((s) => (
            <button key={s.valor} type="button" className="chip" aria-pressed={st === s.valor} onClick={() => setSt(s.valor)}
              style={st === s.valor ? { background: "var(--ink)", color: "var(--card)", borderColor: "var(--ink)", fontSize: 12.5 } : { fontSize: 12.5 }}>
              {s.rotulo}
            </button>
          ))}
        </div>
      )}
      {fora && <div className="ajuda">Sem problema: isso vira uma tarefa no seu Plano e você completa quando tiver.</div>}
    </div>
  );
}

/** Etapa de estoque: subir os relatórios do sistema e a mensagem pronta para pedir ao suporte. */
function Relatorios({ portalId, nome, loja, aoMudar }: { portalId: string; nome: string; loja: string; aoMudar: (n: number) => void }) {
  const { dados, recarregar } = useDados(async () => {
    const l = await listarRelatorios(portalId);
    const drive = await relatoriosNoDrive(portalId);
    aoMudar(l.length + drive.length);
    return Object.assign(l, { drive });
  }, [portalId]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const msg = mensagemSuporte(nome, loja);
  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Tem relatório do sistema? Suba aqui</h2>
      <p className="mudo" style={{ marginTop: -4 }}>Planilha do Excel, CSV, PDF ou até foto da tela. A gente lê e organiza. Os arquivos ficam guardados só para a sua loja e a equipe.</p>
      <input type="file" accept=".xlsx,.xls,.csv,.ods,.pdf,image/*" multiple disabled={enviando} onChange={async (e) => {
        setErro(""); setEnviando(true);
        try { for (const f of [...(e.target.files ?? [])]) await subirRelatorio(portalId, f); recarregar(); } catch (x) { setErro((x as Error).message); }
        setEnviando(false); e.target.value = "";
      }} />
      {enviando && <p className="ajuda">Enviando…</p>}
      {erro && <div className="aviso mt">{erro}</div>}
      {!!dados?.length && (
        <div className="mt">
          {dados.map((a) => (
            <div key={a.caminho} className="linha entre marcar" style={{ cursor: "default" }}>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>📎 {a.nome} <small className="mudo">· {tamanhoLegivel(a.tamanho)} · {dataCurta(a.em)}</small></span>
              <button type="button" className="btn s peq" onClick={() => abrirRelatorio(a.caminho)}>Abrir</button>
            </div>
          ))}
        </div>
      )}

      {!!dados?.drive.length && (
        <div className="mt">
          <b>Relatórios que você já mandou para a equipe</b>
          <p className="ajuda" style={{ margin: "2px 0 6px" }}>Estão com a equipe e já entram nas análises. Não precisa subir de novo.</p>
          {dados.drive.map((r) => (
            <div key={r.id} className="linha entre marcar" style={{ cursor: "default" }}>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>📄 {r.nome} <small className="mudo">· {r.tipo}{r.periodo ? ` · ${r.periodo}` : ""}</small></span>
              <a className="btn s peq" href={r.url} target="_blank" rel="noopener">Abrir</a>
            </div>
          ))}
        </div>
      )}

      <details className="mt">
        <summary style={{ cursor: "pointer" }}><b>Não sabe como tirar o relatório? Peça ao suporte do seu sistema</b></summary>
        <p className="mudo">Copie a mensagem e mande no WhatsApp ou no e-mail do suporte. Ela diz exatamente o que pedir.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "var(--soft)", borderRadius: 12, padding: 14, fontFamily: "inherit", fontSize: 14 }}>{msg}</pre>
        <div className="linha" style={{ gap: 8 }}>
          <Copiar texto={msg} rotulo="Copiar mensagem" />
          <a className="btn s peq" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Abrir no WhatsApp</a>
        </div>
        <ul className="ajuda" style={{ paddingLeft: 18 }}>
          <li>Se o suporte só conseguir um, peça o <b>número 1</b>: ele sozinho já mostra a situação do seu estoque.</li>
          <li>Recebeu? É só subir aqui do jeito que veio.</li>
          <li>Ainda não tem? Responda as perguntas abaixo estimando e siga a jornada.</li>
        </ul>
      </details>
    </div>
  );
}

function Etapa() {
  const router = useRouter();
  const n = Number(useSearchParams().get("n"));
  const etapa = ETAPAS.find((e) => e.numero === n);
  const posicao = ETAPAS.findIndex((e) => e.numero === n) + 1;
  const { portal, pers, recarregar, nome } = usePortal();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivos, setArquivos] = useState(0);
  if (!etapa) return <div className="card">Etapa não encontrada.</div>;
  const r = pers.get(etapa.numero)?.respostas ?? {};
  const assina = (pers.get(2)?.respostas?.seu_nome as string) || primeiroNome(nome);
  const varias = (portal.lojas ?? []).length > 1;

  return (
    <>
      <Titulo voltar={{ href: "/personalizacao", rotulo: "Dados da loja" }} titulo={`${posicao}. ${etapa.titulo}`} sub={etapa.descricao} />
      {varias && <div className="aviso mb" style={{ maxWidth: 720 }}>Vocês têm {portal.lojas.join(" e ")}. Quando a resposta for diferente em cada loja, escreva as duas. Ex.: &quot;{portal.lojas[0]}: … · {portal.lojas[1]}: …&quot;.</div>}
      {etapa.numero === 5 && <EquipeDaEtapa portalId={portal.id} />}
      {etapa.numero === 8 && <Relatorios portalId={portal.id} nome={assina} loja={portal.loja} aoMudar={setArquivos} />}
      <form
        className="card"
        style={{ maxWidth: 720 }}
        action={async (form) => {
          setErro(""); setSalvando(true);
          try {
            await salvarEtapa(portal.id, etapa.numero, form, { semRelatorio: arquivos === 0 });
            await recarregar();
            router.push(`/personalizacao?salvo=${posicao}`);
          } catch (e) { setErro((e as Error).message); setSalvando(false); }
        }}
      >
        {etapa.campos.some((c) => c.dado) && (
          <p className="ajuda" style={{ marginTop: 0 }}>Nos números, marque se é um dado que você tem, uma estimativa ou se ainda não tem. Nada trava: o que faltar vira tarefa no seu Plano.</p>
        )}
        {etapa.campos.map((c) => <CampoEtapa key={c.id} c={c} r={r} padrao={c.id === "loja" ? portal.loja : ""} />)}
        {erro && <div className="aviso mt">{erro}</div>}
        <div className="linha mt"><button className="btn p" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar etapa"}</button></div>
      </form>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Etapa /></Suspense>;
}
