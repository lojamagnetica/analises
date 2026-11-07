"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { CampoEtapa } from "@/components/CampoEtapa";
import { EquipeDaEtapa } from "@/components/EquipeDaEtapa";
import { Titulo } from "@/components/Titulo";
import { Carregando, emDemonstracao, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { ETAPAS } from "@/lib/conteudo";
import { salvarEtapa } from "@/lib/acoes";
import { dataCurta } from "@/lib/formato";
import { relatoriosNoDrive } from "@/lib/gestao";
import { ARQUIVOS_ETAPA, RELATORIOS, abrirRelatorio, excluirRelatorio, listarRelatorios, mensagemSuporte, subirRelatorio, tamanhoLegivel, type TipoRelatorio } from "@/lib/relatorios";
import { Excluir } from "@/components/Excluir";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { emOnboarding } from "@/lib/entrada";

/** Etapa de estoque: um lugar para cada relatório do sistema e a mensagem pronta para pedir ao suporte. */
function Relatorios({ portalId, nome, loja, aoMudar }: { portalId: string; nome: string; loja: string; aoMudar: (n: number) => void }) {
  const { dados, recarregar } = useDados(async () => {
    const l = await listarRelatorios(portalId);
    const drive = await relatoriosNoDrive(portalId);
    aoMudar(l.length + drive.length);
    return Object.assign(l, { drive });
  }, [portalId]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const msg = mensagemSuporte(nome, loja);
  const subir = async (tipo: TipoRelatorio, arquivos: FileList | null) => {
    if (emDemonstracao()) { setErro("Aqui é só uma demonstração: no seu Hub, o arquivo sobe e a equipe recebe na hora."); return; }
    setErro(""); setEnviando(tipo);
    try {
      const lista = [...(arquivos ?? [])];
      for (const f of lista) await subirRelatorio(portalId, f, tipo);
      // Camilla e Claudia recebem o alerta do envio (a equipe subindo não avisa).
      if (lista.length) await supabaseBrowser().rpc("avisar_envio", { p_qtd: lista.length, p_tipo: RELATORIOS.find((x) => x.chave === tipo)?.titulo ?? "Outros relatórios" });
      recarregar();
    } catch (x) { setErro((x as Error).message); }
    setEnviando(null);
  };
  const Lista = ({ tipo }: { tipo: string }) => (
    <>
      {(dados ?? []).filter((a) => a.tipo === tipo).map((a) => (
        <div key={a.caminho} className="linha entre" style={{ padding: "4px 0" }}>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>📎 {a.nome} <small className="mudo">· {tamanhoLegivel(a.tamanho)} · {dataCurta(a.em)}</small></span>
          <span className="linha" style={{ gap: 10 }}>
            <button type="button" className="link-loja" onClick={() => abrirRelatorio(a.caminho)}>Abrir</button>
            <Excluir pergunta={`Excluir o arquivo ${a.nome}?`} fazer={() => excluirRelatorio(a.caminho)} aoFim={recarregar} />
          </span>
        </div>
      ))}
    </>
  );
  const recebidos = RELATORIOS.filter((r) => dados?.some((a) => a.tipo === r.chave)).length;
  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Os relatórios do seu sistema · {recebidos} de {RELATORIOS.length}</h2>
      <p className="mudo" style={{ marginTop: -4 }}>São eles que mostram de verdade como a loja está: o que vende, o que está parado e quem são as suas clientes. Pode ser planilha do Excel, CSV, PDF ou até foto da tela. Os arquivos ficam guardados só para a sua loja e a equipe.</p>
      <div className="aviso mb" style={{ fontSize: 14 }}>Não tem sistema ou algum relatório? Tudo bem: responda as perguntas lá embaixo com o que você souber (pode ser estimativa) ou marque &quot;Ainda não tenho&quot;. Nada trava.</div>
      {RELATORIOS.map((r, i) => {
        const tem = dados?.some((a) => a.tipo === r.chave);
        return (
          <div key={r.chave} style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}>
            <div className="linha" style={{ gap: 10, alignItems: "flex-start" }}>
              <span className={`selo ${tem ? "feito" : "espera"}`}>{tem ? "✓" : i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{r.titulo}</b>
                <div className="ajuda" style={{ margin: "2px 0 8px" }}>Precisa ter: {r.oque}</div>
                <Lista tipo={r.chave} />
                <label className="btn s peq" style={{ cursor: enviando ? "wait" : "pointer", marginTop: 6 }}>
                  📎 {tem ? "Subir outro arquivo" : "Subir arquivo"}
                  <input type="file" hidden accept=".xlsx,.xls,.csv,.ods,.pdf,image/*" multiple disabled={!!enviando} onChange={(e) => { subir(r.chave, e.target.files); e.target.value = ""; }} />
                </label>
                {enviando === r.chave && <p className="ajuda">Enviando…</p>}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}>
        <b>Outros relatórios (opcional)</b>
        <div className="ajuda" style={{ margin: "2px 0 8px" }}>Vendas por vendedora, ticket médio ou o que mais achar útil.</div>
        <Lista tipo="outros" />
        <label className="btn s peq" style={{ cursor: enviando ? "wait" : "pointer", marginTop: 6 }}>
          📎 Subir arquivo
          <input type="file" hidden accept=".xlsx,.xls,.csv,.ods,.pdf,image/*" multiple disabled={!!enviando} onChange={(e) => { subir("outros", e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {erro && <div className="aviso mt">{erro}</div>}

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
        <summary style={{ cursor: "pointer" }}><b>Não sabe como tirar os relatórios? Peça ao suporte do seu sistema</b></summary>
        <p className="mudo">Copie a mensagem e mande no WhatsApp ou no e-mail do suporte. Ela diz exatamente o que pedir.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "var(--soft)", borderRadius: 12, padding: 14, fontFamily: "inherit", fontSize: 14 }}>{msg}</pre>
        <div className="linha" style={{ gap: 8 }}>
          <Copiar texto={msg} rotulo="Copiar mensagem" />
          <a className="btn s peq" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Abrir no WhatsApp</a>
        </div>
        <ul className="ajuda" style={{ paddingLeft: 18 }}>
          <li>Recebeu? Suba cada um no lugar certo, do jeito que veio.</li>
          <li>Não tem sistema ou ainda não conseguiu? Responda as perguntas abaixo estimando e siga a jornada.</li>
        </ul>
      </details>
    </div>
  );
}

/** Arquivos das outras etapas (faturamento, prints do Instagram, vídeo e fotos da loja), cada um no seu lugar. */
function ArquivosDaEtapa({ portalId, etapa }: { portalId: string; etapa: number }) {
  const lugares = ARQUIVOS_ETAPA.filter((a) => a.etapa === etapa);
  const { dados, recarregar } = useDados(() => listarRelatorios(portalId), [portalId]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  if (!lugares.length) return null;
  const subir = async (chave: string, titulo: string, arquivos: FileList | null) => {
    if (emDemonstracao()) { setErro("Aqui é só uma demonstração: no seu Hub, o arquivo sobe e a equipe recebe na hora."); return; }
    setErro(""); setEnviando(chave);
    try {
      const lista = [...(arquivos ?? [])];
      for (const f of lista) await subirRelatorio(portalId, f, chave);
      if (lista.length) await supabaseBrowser().rpc("avisar_envio", { p_qtd: lista.length, p_tipo: titulo });
      recarregar();
    } catch (x) { setErro((x as Error).message); }
    setEnviando(null);
  };
  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Arquivos desta etapa</h2>
      {lugares.map((l) => {
        const meus = (dados ?? []).filter((a) => a.tipo === l.chave);
        return (
          <div key={l.chave} style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}>
            <span className={`selo ${meus.length ? "feito" : "espera"}`} style={{ float: "right" }}>{meus.length ? "recebido" : "falta"}</span>
            <b>{l.titulo}</b>
            <div className="ajuda" style={{ margin: "2px 0 8px" }}>{l.oque}</div>
            {meus.map((a) => (
              <div key={a.caminho} className="linha entre" style={{ padding: "4px 0" }}>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>📎 {a.nome} <small className="mudo">· {tamanhoLegivel(a.tamanho)} · {dataCurta(a.em)}</small></span>
                <span className="linha" style={{ gap: 10 }}>
                  <button type="button" className="link-loja" onClick={() => abrirRelatorio(a.caminho)}>Abrir</button>
                  <Excluir pergunta={`Excluir o arquivo ${a.nome}?`} fazer={() => excluirRelatorio(a.caminho)} aoFim={recarregar} />
                </span>
              </div>
            ))}
            <label className="btn s peq" style={{ cursor: enviando ? "wait" : "pointer", marginTop: 6 }}>
              📎 {meus.length ? "Subir outro arquivo" : l.video ? "Subir o vídeo" : "Subir arquivo"}
              <input type="file" hidden accept={l.aceita} multiple={!l.video} disabled={!!enviando} onChange={(e) => { subir(l.chave, l.titulo, e.target.files); e.target.value = ""; }} />
            </label>
            {enviando === l.chave && <p className="ajuda">Enviando… {l.video ? "(vídeo pode levar alguns minutos, não feche a página)" : ""}</p>}
          </div>
        );
      })}
      <p className="ajuda" style={{ marginBottom: 0 }}>Não tem algum desses arquivos? Sem problema: escreva no formulário abaixo o que souber ou marque &quot;Ainda não tenho&quot;.</p>
      {erro && <div className="aviso mt">{erro}</div>}
    </div>
  );
}

function Etapa() {
  const router = useRouter();
  const busca = useSearchParams();
  const n = Number(busca.get("n"));
  const feita = busca.get("feita");
  const etapa = ETAPAS.find((e) => e.numero === n);
  const posicao = ETAPAS.findIndex((e) => e.numero === n) + 1;
  const { portal, pers, recarregar, nome, equipe, entrada } = usePortal();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivos, setArquivos] = useState(0);
  if (!etapa) return <div className="card">Etapa não encontrada.</div>;
  // Trilha guiada no onboarding: uma etapa abre quando a anterior foi concluída.
  const pendente = ETAPAS.find((e) => !pers.get(e.numero)?.concluida);
  const demo = emDemonstracao();
  const naTrilha = !equipe && emOnboarding(entrada) && !demo;
  if (naTrilha && pendente && !pers.get(etapa.numero)?.concluida && pendente.numero !== etapa.numero) {
    const pos = ETAPAS.indexOf(pendente) + 1;
    return (
      <>
        <Titulo voltar={{ href: "/personalizacao", rotulo: "Dados da loja" }} titulo={`${posicao}. ${etapa.titulo}`} />
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)", maxWidth: 640 }}>
          <div style={{ fontSize: 30 }}>🔒</div>
          <h3 style={{ margin: "6px 0" }}>Esta etapa abre quando você concluir a anterior.</h3>
          <p className="mudo">Os Dados da loja seguem em ordem: o que você conta em uma etapa ajuda na próxima.</p>
          <Link className="btn p" href={`/personalizacao/etapa?n=${pendente.numero}`}>Ir para a etapa {pos}: {pendente.titulo} →</Link>
        </div>
      </>
    );
  }
  const seguinte = ETAPAS.slice(ETAPAS.indexOf(etapa) + 1).find((e) => !pers.get(e.numero)?.concluida) ?? ETAPAS.find((e) => e.numero !== etapa.numero && !pers.get(e.numero)?.concluida);
  const r = pers.get(etapa.numero)?.respostas ?? {};
  const assina = (pers.get(2)?.respostas?.seu_nome as string) || primeiroNome(nome);
  const varias = (portal.lojas ?? []).length > 1;

  return (
    <>
      <Titulo voltar={{ href: "/personalizacao", rotulo: "Dados da loja" }} titulo={`${posicao}. ${etapa.titulo}`} sub={etapa.descricao} />
      {feita && <div className="aviso ok mb" style={{ maxWidth: 720 }}>Etapa {feita} enviada ✓ Agora a etapa {posicao} de {ETAPAS.length}.</div>}
      {varias && <div className="aviso mb" style={{ maxWidth: 720 }}>Vocês têm {portal.lojas.join(" e ")}. Quando a resposta for diferente em cada loja, escreva as duas. Ex.: &quot;{portal.lojas[0]}: … · {portal.lojas[1]}: …&quot;.</div>}
      {etapa.numero === 5 && <EquipeDaEtapa portalId={portal.id} demo={demo} />}
      <ArquivosDaEtapa portalId={portal.id} etapa={etapa.numero} />
      {etapa.numero === 8 && <Relatorios portalId={portal.id} nome={assina} loja={portal.loja} aoMudar={setArquivos} />}
      <form
        className="card"
        style={{ maxWidth: 720 }}
        action={async (form) => {
          if (demo) { setErro("Aqui é só uma demonstração: no seu Hub, este botão salva a etapa e abre a próxima."); return; }
          setErro(""); setSalvando(true);
          try {
            await salvarEtapa(portal.id, etapa.numero, form, { semRelatorio: arquivos === 0 });
            await recarregar();
            // Na trilha, segue direto para a próxima etapa; no fim, volta para o resumo.
            router.push(naTrilha && seguinte ? `/personalizacao/etapa?n=${seguinte.numero}&feita=${posicao}` : `/personalizacao?salvo=${posicao}`);
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
