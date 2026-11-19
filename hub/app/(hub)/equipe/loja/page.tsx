"use client";

// Ficha da loja: um lugar só para cada cliente. Resumo, conversas (com o histórico inteiro), jornada, reuniões e planos, acesso.
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { OQueAconteceu } from "@/components/OQueAconteceu";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta, dataHora, haQuanto, hoje, moeda } from "@/lib/formato";
import { buscarFicha } from "@/lib/ficha-loja";
import { buscarLojas, linhaDoTempo } from "@/lib/contatos";
import { linkZap } from "@/lib/cs";

const ABAS = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "conversas", rotulo: "Conversas e histórico" },
  { id: "jornada", rotulo: "Jornada" },
  { id: "reunioes", rotulo: "Reuniões e planos" },
  { id: "acesso", rotulo: "Acesso e dados" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const COR_TERM: Record<string, string> = { Verde: "var(--feito)", Amarelo: "var(--orange)", Vermelho: "var(--red)" };
const ROTULO = { contato: "Contato", combinado: "Combinado", conversa: "Conversa interna" } as const;

/** Sem loja escolhida: a lista para escolher (as acompanhadas primeiro). */
function Escolher() {
  const { dados } = useDados(() => buscarLojas(), []);
  const [busca, setBusca] = useState("");
  if (!dados) return <Carregando />;
  const lista = dados.filter((l) => l.loja.toLowerCase().includes(busca.toLowerCase()));
  return (
    <>
      <Titulo titulo="Ficha da loja" sub="Tudo de uma loja num lugar só: o resumo, as conversas, a jornada, as reuniões e o acesso." />
      <input type="search" placeholder="Buscar a loja" value={busca} onChange={(e) => setBusca(e.target.value)} className="mb" style={{ maxWidth: 360 }} />
      <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {lista.map((l) => (
          <Link key={l.id} href={`/equipe/loja?id=${l.id}`} className="card" style={{ padding: 12, textDecoration: "none", color: "inherit" }}>
            <b>{l.loja}</b>{l.acompanhada && <span className="selo andamento" style={{ marginLeft: 6 }}>acompanhada</span>}
          </Link>
        ))}
      </div>
    </>
  );
}

function Ficha({ id }: { id: string }) {
  const router = useRouter();
  const aba = (ABAS.find((a) => a.id === useSearchParams().get("aba"))?.id ?? "resumo") as Aba;
  const { abrirPortal, conversas } = useEquipe();
  const { dados: carregado, recarregar } = useDados(async () => ({ f: await buscarFicha(id) }), [id]);
  const { dados: linha, recarregar: recarregarLinha } = useDados(() => linhaDoTempo(id, conversas), [id, conversas]);
  if (!carregado) return <Carregando />;
  const f = carregado.f;
  if (!f) return <div className="card">Loja não encontrada. <Link href="/equipe/loja">Escolher outra</Link></div>;
  const p = f.portal;
  const ir = (a: Aba) => router.replace(`/equipe/loja?id=${id}&aba=${a}`);
  const atualizar = () => { recarregar(); recarregarLinha(); };
  const pct = f.mes.meta ? Math.round((f.mes.vendido / f.mes.meta) * 100) : null;
  const ultimoAcesso = f.acessos.map((a) => a.ultimo_acesso).filter(Boolean).sort().reverse()[0] ?? null;

  return (
    <>
      <p className="mb" style={{ marginTop: 0 }}><Link href="/equipe/loja">← Todas as lojas</Link></p>
      <Titulo titulo={p.loja} sub={[p.responsavel, p.tipo, f.ficha?.foco_curto].filter(Boolean).join(" · ")} />
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        {f.ficha?.termometro && <span className="selo" style={{ background: COR_TERM[f.ficha.termometro] ?? "var(--soft)", color: "#fff" }}>{f.ficha.termometro}</span>}
        <span className="mudo">{ultimoAcesso ? `entrou no Hub ${haQuanto(ultimoAcesso)}` : "ainda não entrou no Hub"}</span>
        {p.whatsapp && <a className="btn s peq" href={linkZap(p.whatsapp, "")} target="_blank" rel="noopener">WhatsApp</a>}
        <button type="button" className="btn s peq" onClick={() => abrirPortal(id, "/inicio")}>Abrir o portal da loja</button>
      </div>

      <div className="chips mb" role="tablist">
        {ABAS.map((a) => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={`chip${aba === a.id ? " escolhido" : ""}`} onClick={() => ir(a.id)}>{a.rotulo}</button>)}
      </div>

      {aba === "resumo" && (
        <>
          <div className="grade g4 mb">
            <div className="kpi"><small>Vendido no mês</small><b style={{ fontSize: 22 }}>{moeda(f.mes.vendido)}</b><small className="mudo">{f.mes.meta ? `${pct}% de ${moeda(f.mes.meta)}` : "sem meta no Planeje"}</small></div>
            <div className="kpi"><small>Vendas · peças</small><b style={{ fontSize: 22 }}>{f.mes.vendas} · {f.mes.pecas}</b><small className="mudo">{f.mes.dias} dias de caixa lançados</small></div>
            <div className="kpi"><small>Próxima reunião</small><b style={{ fontSize: 16 }}>{f.proxima ? dataHora(f.proxima.data) : "nenhuma marcada"}</b><small className="mudo">{f.proxima?.titulo ?? ""}</small></div>
            <div className="kpi"><small>Leitura da semana</small><b style={{ fontSize: 16 }}>{f.leitura ? (f.leitura.publicada ? "publicada" : "em rascunho") : "nenhuma"}</b><small className="mudo">{f.leitura ? `semana de ${dataCurta(f.leitura.semana)}` : ""}</small></div>
          </div>
          {f.ficha?.resultado_n1 && <div className="card mb"><small className="mudo">Resultado nº 1 (Contrato de Foco)</small><div>{f.ficha.resultado_n1}</div>{f.ficha.indicador && <small className="mudo">{f.ficha.indicador}</small>}</div>}
          <div className="card mb">
            <b>O que está pendente hoje</b>
            {!f.alertas.length && !f.lembretes.length && <p className="mudo" style={{ margin: "4px 0 0" }}>Nada pendente com esta loja agora.</p>}
            {f.lembretes.map((l) => (
              <div key={l.id} style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <span>{l.texto}</span> <small className="mudo">· lembrete {l.quando ? dataCurta(l.quando) : ""}{l.quando && l.quando < hoje() ? " (atrasado)" : ""}</small>
              </div>
            ))}
            {f.alertas.map((a) => (
              <div key={a.chave} style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ color: a.grave ? "var(--red)" : "inherit" }}>{a.txt}</div>
                {a.registro && <OQueAconteceu registro={{ portalId: id, tipo: a.registro.tipo, ref: a.registro.ref, loja: p.loja }} feito={atualizar} />}
              </div>
            ))}
          </div>
          {f.combinados.length > 0 && (
            <div className="card mb"><b>Combinados abertos · {f.combinados.length}</b>
              {f.combinados.map((c, i) => <div key={i} style={{ padding: "4px 0", borderTop: "1px solid var(--line)" }}>{c.texto}{c.prazo && <small className="mudo"> · até {dataCurta(c.prazo)}</small>}</div>)}
            </div>
          )}
        </>
      )}

      {aba === "conversas" && (
        <>
          <div className="card mb">
            <b>Registrar</b>
            <p className="ajuda" style={{ marginTop: 2 }}>Conversou, tentou e não conseguiu, mandou mensagem ou decidiu que não precisava: tudo fica no histórico da loja.</p>
            <OQueAconteceu registro={{ portalId: id, tipo: "geral", ref: hoje(), loja: p.loja }} feito={atualizar} inicial="conversei" comCanal />
          </div>
          <div className="secao">Histórico</div>
          {!linha ? <Carregando /> : !linha.length ? <p className="mudo">Nada registrado ainda.</p> : linha.map((i, n) => (
            <div key={n} className="card mb" style={{ padding: 12 }}>
              <div className="linha entre" style={{ gap: 8 }}><b>{i.titulo}</b><small className="mudo">{ROTULO[i.tipo]} · {dataHora(i.quando)}</small></div>
              {i.texto && <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{i.texto}</div>}
              {i.ajuda && <span className="selo alerta">pediu ajuda</span>}
              {i.extra && <small className="mudo">{i.extra}</small>}
            </div>
          ))}
        </>
      )}

      {aba === "jornada" && (
        <div className="card">
          <p style={{ marginTop: 0 }}>{f.ficha?.etapa ? <>Etapa <b>{f.ficha.etapa}</b> da jornada{f.ficha.situacao ? ` · ${f.ficha.situacao}` : ""}.</> : "Sem etapa marcada."}{f.ficha?.data_diagnostico ? ` Diagnóstico em ${dataCurta(f.ficha.data_diagnostico)}.` : ""}</p>
          <p className="mudo">O checklist de cada etapa, a passagem do Comercial, o contrato e as mensagens padrão.</p>
          <Link className="btn p peq" href={`/equipe/central/cliente?id=${id}`}>Abrir a jornada desta loja</Link>
        </div>
      )}

      {aba === "reunioes" && (
        <div className="card">
          <p style={{ marginTop: 0 }}>Última reunião: {f.ultima ? `${f.ultima.titulo} · ${dataCurta(f.ultima.data)}` : "nenhuma registrada"}. Próxima: {f.proxima ? `${f.proxima.titulo} · ${dataHora(f.proxima.data)}` : "nenhuma marcada"}.</p>
          <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn s peq" onClick={() => abrirPortal(id, "/leitura")}>Leitura da semana</button>
            <button type="button" className="btn s peq" onClick={() => abrirPortal(id, "/consultoria/reunioes")}>Reuniões de gestão</button>
            <button type="button" className="btn s peq" onClick={() => abrirPortal(id, `/planeje/mes?m=${hoje().slice(0, 7)}`)}>Planeje do mês</button>
            <button type="button" className="btn s peq" onClick={() => abrirPortal(id, "/gestao/caixa")}>Caixa</button>
            <button type="button" className="btn s peq" onClick={() => abrirPortal(id, "/plano")}>Plano 90 dias</button>
          </div>
        </div>
      )}

      {aba === "acesso" && (
        <div className="card">
          <b>Quem acessa</b>
          {!f.acessos.length && <p className="mudo">Ninguém com acesso ainda.</p>}
          {f.acessos.map((a, i) => (
            <div key={i} style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <b>{a.nome ?? "—"}</b> <span className="mudo">· {a.email} · {a.ultimo_acesso ? `entrou ${haQuanto(a.ultimo_acesso)}` : "nunca entrou"}</span>
              {a.so_caixa ? <span className="selo andamento" style={{ marginLeft: 6 }}>só envios e caixa</span> : <span className="selo feito" style={{ marginLeft: 6 }}>vê o portal inteiro</span>}
            </div>
          ))}
          <p className="mudo mt">Para criar acesso, dar nova senha, mudar os dados do portal, o passo da jornada ou a Ficha (Contrato de Foco):</p>
          <Link className="btn p peq" href={`/equipe/portal?id=${id}`}>Editar o portal</Link>
        </div>
      )}
    </>
  );
}

function Pagina() {
  const id = useSearchParams().get("id") ?? "";
  return id ? <Ficha id={id} /> : <Escolher />;
}

export default function FichaDaLoja() {
  return <Suspense fallback={<Carregando />}><Pagina /></Suspense>;
}
