"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { CampoReais } from "@/components/CampoReais";
import { Excluir } from "@/components/Excluir";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES } from "@/lib/conteudo";
import { dia, dataCurta, hoje, moeda } from "@/lib/formato";
import { buscarAcoes } from "@/lib/acoes-mes";
import { fimDoMes, mesValido } from "@/lib/caixa";
import { quemVende } from "@/lib/pessoas";
import {
  CRESCIMENTO_PADRAO, RESULTADOS, STATUS_PLANO, buscarPlano, completar, faltaNoPlano, metaDoPlano, nomeMes, prazoDoPlano, salvarPlano,
  diasDeLoja, metasDoTime, semanasDoMes, sugerirSemanas, vendaDoAnoPassado, type DadosPlano, type StatusPlano,
} from "@/lib/plano-mes";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Aceita "2026-11" ou o formato antigo (?m=10 = novembro, o próximo que vier). */
function mesDaUrl(m: string | null) {
  if (mesValido(m)) return m;
  const n = Number(m);
  if (m == null || !Number.isInteger(n) || n < 0 || n > 11) return null;
  const atual = hoje().slice(0, 7);
  const ano = Number(atual.slice(0, 4)) + (n < Number(atual.slice(5, 7)) - 1 ? 1 : 0);
  return `${ano}-${String(n + 1).padStart(2, "0")}`;
}

function Passo({ n, titulo, sub, children }: { n: number | string; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
      <div className="linha" style={{ gap: 10, alignItems: "baseline" }}>
        <span className="selo andamento">{n}</span>
        <h3 style={{ margin: 0 }}>{titulo}</h3>
      </div>
      {sub && <p className="mudo" style={{ margin: "6px 0 10px" }}>{sub}</p>}
      {children}
    </div>
  );
}

function Plano({ mes }: { mes: string }) {
  const { portal } = usePortal();
  const nMes = Number(mes.slice(5, 7)) - 1;
  const anoPassado = Number(mes.slice(0, 4)) - 1;
  const { dados: base, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [linha, { data: datas }, { data: antigo }, acoes, venda, { data: diag }, { data: time }] = await Promise.all([
      buscarPlano(portal.id, mes),
      sb.from("datas_comerciais").select("dia, titulo").eq("mes", nMes).order("dia", { nullsFirst: true }),
      sb.from("planeje").select("bloco, texto").eq("portal_id", portal.id).eq("mes", nMes),
      buscarAcoes().catch(() => []),
      vendaDoAnoPassado(portal.id, mes).catch(() => null),
      sb.from("loja_diagnostico").select("dados").eq("portal_id", portal.id).eq("status", "liberada"),
      sb.from("loja_equipe").select("id, nome, funcao").eq("portal_id", portal.id).eq("ativo", true).order("nome"),
    ]);
    const fim = fimDoMes(mes);
    const opcoes = acoes.filter((a) => a.publicada && (a.venda_inicio ?? a.data_acao) <= fim && a.fim >= `${mes}-01`);
    const linhasDiag = (diag ?? []).flatMap((d) => ((d.dados as { abc?: { linhas?: { nome: string }[] } })?.abc?.linhas ?? []).map((l) => l.nome)).slice(0, 6);
    return {
      linha, datas: (datas ?? []) as { dia: number | null; titulo: string }[], venda, opcoes, linhasDiag,
      time: (time ?? []) as { id: string; nome: string; funcao: string | null }[],
      antigo: (antigo ?? []).filter((b) => (b.texto as string).trim()) as { bloco: string; texto: string }[],
    };
  }, [portal.id, mes]);

  const [d, setD] = useState<DadosPlano | null>(null);
  const [status, setStatus] = useState<StatusPlano>("rascunho");
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const [erro, setErro] = useState("");
  const salvo = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Monta o plano quando os dados chegam (com a venda do ano passado já puxada, se tiver).
  useEffect(() => {
    if (!base) return;
    const c = completar(base.linha?.dados, base.datas);
    const puxou = !c.base && !!base.venda;
    if (puxou && base.venda) { c.base = base.venda.valor; c.base_fonte = base.venda.fonte; }
    setD(c);
    setStatus(base.linha?.status ?? "rascunho");
    // Só abrir a página não salva nada; salva quando a loja mexe (ou quando o Hub puxou a venda do ano passado).
    salvo.current = base.linha && !puxou ? JSON.stringify(c) : base.linha ? "" : JSON.stringify(c);
  }, [base]);

  // Salva sozinho enquanto a loja escreve.
  useEffect(() => {
    if (!d || JSON.stringify(d) === salvo.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando"); setErro("");
      try { await salvarPlano(portal.id, mes, d); salvo.current = JSON.stringify(d); setEstado("salvo"); }
      catch (e) { setErro((e as Error).message); setEstado(""); }
    }, 900);
    return () => clearTimeout(timer.current);
  }, [d, portal.id, mes]);

  if (!base || !d) return <Carregando />;
  const muda = (x: Partial<DadosPlano>) => setD({ ...d, ...x });
  const meta = metaDoPlano(d);
  const semanas = semanasDoMes(mes);
  // Domingo não conta: a meta do dia é sobre os dias de loja aberta.
  const diasNoMes = diasDeLoja(`${mes}-01`, fimDoMes(mes));
  // Só quem vende entra na divisão (quem já tem meta ajustada continua).
  const time = quemVende(base.time, Object.entries(d.metas ?? {}).filter(([, v]) => v > 0).map(([id]) => id));
  const metas = metasDoTime(meta, time.map((p) => p.id), d.metas);
  const prazo = prazoDoPlano(mes);
  const falta = faltaNoPlano(d);
  const st = STATUS_PLANO[status];
  const linha = base.linha;
  const enviar = async () => {
    setErro("");
    try { await salvarPlano(portal.id, mes, d, "enviado"); salvo.current = JSON.stringify(d); setStatus("enviado"); recarregar(); }
    catch (e) { setErro((e as Error).message); }
  };

  return (
    <>
      <Titulo voltar={{ href: "/planeje", rotulo: "Todos os meses" }} titulo={`🗓️ Plano de ${nomeMes(mes)}`} aba={MESES[nMes]}
        sub={`Monte o plano de ação do mês e mande para a Camilla até ${dia(prazo)}. Tudo salva sozinho enquanto você escreve.`} />
      <div className="linha mb" style={{ gap: 8 }}>
        <span className={`selo ${st.classe}`}>{st.texto}</span>
        <small className="mudo">{estado === "salvando" ? "salvando…" : estado === "salvo" ? "salvo ✓" : ""}</small>
      </div>

      {linha?.retorno && (status === "ok" || status === "ajustar") && (
        <div className="card card-borda mb" style={{ ["--c" as string]: status === "ok" ? "var(--green)" : "var(--orange)" }}>
          <h3 style={{ marginTop: 0 }}>{status === "ok" ? "A Camilla aprovou o seu plano ✓" : "A Camilla pediu alguns ajustes"}</h3>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{linha.retorno}</p>
          {linha.retorno_em && <small className="mudo">{dataCurta(linha.retorno_em)}</small>}
        </div>
      )}

      <Passo n={1} titulo="A meta do mês" sub={`Comece pelo que você vendeu em ${MESES[nMes].toLowerCase()} do ano passado. A sugestão da Camilla é crescer ${CRESCIMENTO_PADRAO}%.`}>
        <div className="grade g2" style={{ gap: "0 12px" }}>
          <CampoReais rotulo={`Quanto vendeu em ${MESES[nMes].toLowerCase()} de ${anoPassado}?`} valor={d.base ?? 0} vazio dica="Ex.: 50.000"
            mudar={(v) => muda({ base: v || null, base_fonte: "" })} />
          <CampoReais sem rotulo="Crescimento (%)" valor={d.crescimento} mudar={(v) => muda({ crescimento: v })} />
        </div>
        {d.base_fonte && <div className="ajuda">Puxado do {d.base_fonte}. Se não estiver certo, é só corrigir.</div>}
        {!d.base && <div className="ajuda">Sem esse número no Hub ainda: pegue no seu sistema de vendas.</div>}
        {meta && (
          <div className="grade g3 mt" style={NUM}>
            <div className="kpi"><small>Meta do mês</small><b style={{ fontSize: 24 }}>{moeda(meta)}</b></div>
            <div className="kpi"><small>Por semana</small><b style={{ fontSize: 24 }}>{moeda(meta / 4)}</b></div>
            <div className="kpi"><small>Por dia ({diasNoMes} dias, sem domingos)</small><b style={{ fontSize: 24 }}>{moeda(meta / diasNoMes)}</b></div>
          </div>
        )}
        {meta && time.length > 0 && (
          <div className="mt">
            <div className="linha entre">
              <b>Meta de cada vendedora</b>
              {d.metas && Object.keys(d.metas).length > 0 && (
                <button type="button" className="link-loja" onClick={() => muda({ metas: {} })}>Voltar a dividir por igual</button>
              )}
            </div>
            <p className="ajuda" style={{ marginTop: 2 }}>O Hub divide a meta da loja por igual. Mude o valor de quem precisar: o resto se divide entre as outras. Aqui aparece quem tem função de venda no cadastro da equipe.</p>
            <div className="grade g3" style={{ gap: "0 12px" }}>
              {time.map((p) => (
                <CampoReais key={p.id} rotulo={`${p.nome.split(" ")[0]}${d.metas?.[p.id] != null ? " (ajustada)" : ""}`} valor={metas[p.id] ?? 0}
                  mudar={(v) => muda({ metas: { ...(d.metas ?? {}), [p.id]: v } })} />
              ))}
            </div>
            {Object.values(metas).reduce((a, b) => a + b, 0) > meta + 1 && (
              <div className="aviso mt">As metas das vendedoras somam {moeda(Object.values(metas).reduce((a, b) => a + b, 0))}, mais que a meta da loja ({moeda(meta)}).</div>
            )}
          </div>
        )}
        {meta && (
          <label className="ajuda mt" style={{ display: "block" }}><b style={{ color: "var(--ink)", fontSize: 15 }}>Premiação</b><br />
            O que o time ganha ao bater a meta: o prêmio, de quem é (cada vendedor ou o time todo) e a regra.
            <textarea rows={4} value={d.premiacao ?? ""} onChange={(e) => muda({ premiacao: e.target.value })}
              placeholder={"Ex.: Bateu a meta individual: R$ 300 de bônus.\nA loja bateu a meta do mês: almoço com o time todo."} />
          </label>
        )}
      </Passo>

      <Passo n={2} titulo="O que você fez no ano passado" sub={`Quais ações você fez em ${MESES[nMes].toLowerCase()} de ${anoPassado}? O resultado foi bom?`}>
        {d.acoes_passadas.map((a, i) => {
          const troca = (x: Partial<typeof a>) => muda({ acoes_passadas: d.acoes_passadas.map((y, j) => (j === i ? { ...y, ...x } : y)) });
          return (
            <div key={i} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--line)" : undefined }}>
              <div className="linha" style={{ gap: 8, flexWrap: "nowrap" }}>
                <input type="text" value={a.titulo} placeholder="Ex.: Esquenta Black com 10% no Pix" onChange={(e) => troca({ titulo: e.target.value })} />
                <Excluir pergunta="Tirar esta ação da lista?" fazer={async () => {}} aoFim={() => muda({ acoes_passadas: d.acoes_passadas.filter((_, j) => j !== i) })} rotulo="✕" />
              </div>
              <div className="chips" style={{ marginTop: 6 }}>
                {RESULTADOS.map((r) => (
                  <button key={r.chave} type="button" className={`chip ${a.resultado === r.chave ? "escolhido" : ""}`} aria-pressed={a.resultado === r.chave}
                    onClick={() => troca({ resultado: r.chave })}>{r.nome}</button>
                ))}
              </div>
              {a.resultado && <input type="text" className="mt" value={a.obs} placeholder={a.resultado === "trocar" ? "O que não funcionou?" : "O que vai fazer diferente?"} onChange={(e) => troca({ obs: e.target.value })} />}
            </div>
          );
        })}
        <button type="button" className="btn s peq mt" onClick={() => muda({ acoes_passadas: [...d.acoes_passadas, { titulo: "", resultado: "", obs: "" }] })}>+ Ação do ano passado</button>
        {base.antigo.length > 0 && (
          <details className="mt">
            <summary className="mudo" style={{ cursor: "pointer" }}>O que você anotou para {MESES[nMes].toLowerCase()} no planejamento antigo</summary>
            {base.antigo.map((b) => <p key={b.bloco} style={{ whiteSpace: "pre-wrap" }}><b>{b.bloco}:</b> {b.texto}</p>)}
          </details>
        )}

        <h3 className="mt">As ações deste mês</h3>
        <p className="mudo" style={{ marginTop: -4 }}>Repita o que deu certo e troque o que não deu. Coloque o dia em que cada ação começa a vender.</p>
        {d.acoes.map((a, i) => {
          const troca = (x: Partial<typeof a>) => muda({ acoes: d.acoes.map((y, j) => (j === i ? { ...y, ...x } : y)) });
          return (
            <div key={i} className="linha" style={{ gap: 8, flexWrap: "nowrap", marginBottom: 8 }}>
              <input type="text" value={a.titulo} placeholder="Nome da ação" onChange={(e) => troca({ titulo: e.target.value })} />
              <input type="date" style={{ maxWidth: 170 }} value={a.inicio} min={`${mes}-01`} max={fimDoMes(mes)} aria-label="Começa a vender em" onChange={(e) => troca({ inicio: e.target.value })} />
              <Excluir pergunta="Tirar esta ação do plano?" fazer={async () => {}} aoFim={() => muda({ acoes: d.acoes.filter((_, j) => j !== i) })} rotulo="✕" />
            </div>
          );
        })}
        <button type="button" className="btn s peq" onClick={() => muda({ acoes: [...d.acoes, { titulo: "", inicio: "" }] })}>+ Ação deste mês</button>
        {base.opcoes.some((o) => !d.acoes.some((a) => a.acao_id === o.id)) && (
          <div className="mt">
            <small className="mudo">Ações do Mês prontas para {MESES[nMes].toLowerCase()} (com cronograma, mensagens e conteúdo):</small>
            <div className="chips" style={{ marginTop: 6 }}>
              {base.opcoes.filter((o) => !d.acoes.some((a) => a.acao_id === o.id)).map((o) => (
                <button key={o.id} type="button" className="chip" onClick={() => muda({ acoes: [...d.acoes, { titulo: o.titulo, inicio: o.venda_inicio ?? o.data_acao, acao_id: o.id }] })}>+ {o.titulo}</button>
              ))}
            </div>
          </div>
        )}
      </Passo>

      <Passo n={3} titulo="Datas especiais do mês" sub="Marque as que você vai trabalhar e com que ação. A campanha começa antes da data, não no dia.">
        {!d.datas.length && <p className="mudo" style={{ margin: 0 }}>Nenhuma data comercial cadastrada para este mês.</p>}
        {d.datas.map((x, i) => {
          const troca = (y: Partial<typeof x>) => muda({ datas: d.datas.map((z, j) => (j === i ? { ...z, ...y } : z)) });
          return (
            <div key={x.titulo} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--line)" : undefined }}>
              <label className="linha" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={x.trabalhar} onChange={(e) => troca({ trabalhar: e.target.checked })} />
                <b>{x.dia ? `${x.dia}/${String(nMes + 1).padStart(2, "0")} · ` : ""}{x.titulo}</b>
              </label>
              {x.trabalhar && <input type="text" className="mt" value={x.acao} placeholder="Com que ação? Ex.: esquenta com lista VIP" onChange={(e) => troca({ acao: e.target.value })} />}
            </div>
          );
        })}
      </Passo>

      <Passo n={4} titulo="Produtos em destaque" sub="Quais produtos têm mais a ver com o período? Eles ganham ênfase no conteúdo e na exposição.">
        {d.produtos.map((p, i) => (
          <div key={i} className="linha" style={{ gap: 8, flexWrap: "nowrap", marginBottom: 8 }}>
            <input type="text" value={p} placeholder="Ex.: vestidos de festa" onChange={(e) => muda({ produtos: d.produtos.map((y, j) => (j === i ? e.target.value : y)) })} />
            <Excluir pergunta="Tirar este produto?" fazer={async () => {}} aoFim={() => muda({ produtos: d.produtos.filter((_, j) => j !== i) })} rotulo="✕" />
          </div>
        ))}
        <button type="button" className="btn s peq" onClick={() => muda({ produtos: [...d.produtos, ""] })}>+ Produto</button>
        {base.linhasDiag.filter((l) => !d.produtos.includes(l)).length > 0 && (
          <div className="mt">
            <small className="mudo">As linhas que mais vendem na sua loja (do Diagnóstico):</small>
            <div className="chips" style={{ marginTop: 6 }}>
              {base.linhasDiag.filter((l) => !d.produtos.includes(l)).map((l) => (
                <button key={l} type="button" className="chip" onClick={() => muda({ produtos: [...d.produtos.filter(Boolean), l] })}>+ {l}</button>
              ))}
            </div>
          </div>
        )}
      </Passo>

      <Passo n={5} titulo="As 4 semanas" sub="O foco de cada semana, o conteúdo e a exposição da loja. O foco aparece no seu Início como lembrete, e o conteúdo vai para a Programação da semana.">
        <button type="button" className="btn p peq mb" onClick={() => {
          const temTexto = d.semanas.some((s) => s.foco.trim() || s.conteudo.trim() || s.exposicao.trim());
          if (temTexto && !confirm("Trocar o que já está escrito nas semanas pela sugestão do Hub?")) return;
          muda({ semanas: sugerirSemanas(mes, d) });
        }}>✨ Sugerir as semanas pelo que você respondeu</button>
        <div className="grade g2">
          {semanas.map((s, i) => {
            const sem = d.semanas[i];
            const troca = (x: Partial<typeof sem>) => muda({ semanas: d.semanas.map((y, j) => (j === i ? { ...y, ...x } : y)) });
            return (
              <div key={s.n} className="card" style={{ background: "var(--soft)" }}>
                <div className="linha entre">
                  <b>Semana {s.n} · {s.de} a {s.ate}/{String(nMes + 1).padStart(2, "0")}</b>
                  {meta && <small className="mudo" style={NUM}>meta {moeda(meta / 4)}</small>}
                </div>
                <label className="rotulo">Foco da semana</label>
                <textarea rows={2} value={sem.foco} onChange={(e) => troca({ foco: e.target.value })} placeholder="Ex.: Esquenta Black: lista VIP e pré-venda" />
                <label className="rotulo">Conteúdo</label>
                <textarea rows={3} value={sem.conteudo} onChange={(e) => troca({ conteudo: e.target.value })} placeholder="Ex.: reels de looks com vestidos, stories de espera" />
                <label className="rotulo">Exposição e vitrine</label>
                <textarea rows={2} value={sem.exposicao} onChange={(e) => troca({ exposicao: e.target.value })} placeholder="Ex.: vitrine com vestidos de festa" />
              </div>
            );
          })}
        </div>
        <label className="rotulo mt">Algo mais que a Camilla precisa saber?</label>
        <textarea rows={2} value={d.obs} onChange={(e) => muda({ obs: e.target.value })} placeholder="Opcional" />
      </Passo>

      <div className="card card-borda" style={{ ["--c" as string]: "var(--green)" }}>
        {status === "enviado" ? (
          <p style={{ margin: 0 }}><b>Plano enviado{linha?.enviado_em ? ` em ${dataCurta(linha.enviado_em)}` : ""}.</b> A Camilla vai olhar e te responder aqui. Pode continuar ajustando: ela vê a versão mais nova.</p>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>{status === "ajustar" ? "Ajustou? Mande de novo" : status === "ok" ? "Mudou alguma coisa? Mande de novo" : "Plano pronto? Mande para a Camilla"}</h3>
            {falta.length > 0 && <p className="mudo" style={{ margin: "0 0 10px" }}>Falta preencher: {falta.join(", ")}.</p>}
            <button type="button" className="btn p" disabled={falta.length > 0} onClick={enviar}>Enviar para a Camilla</button>
            {hoje() > prazo && <p className="ajuda">O prazo era {dia(prazo)}. Mande assim que puder.</p>}
          </>
        )}
        {erro && <div className="aviso mt">{erro}</div>}
      </div>
    </>
  );
}

function Pagina() {
  const mes = mesDaUrl(useSearchParams().get("m"));
  if (!mes) return <div className="card">Mês não encontrado.</div>;
  return <Plano key={mes} mes={mes} />;
}

export default function PlanoDoMes() {
  return <Suspense fallback={<Carregando />}><Pagina /></Suspense>;
}

