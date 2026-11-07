"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copiar } from "@/components/Copiar";
import { CampoEtapa } from "@/components/CampoEtapa";
import { LinkAcesso } from "@/components/LinkAcesso";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { dataCurta, dataHora, hoje, isoParaLocal, localParaIso } from "@/lib/formato";
import { gerarLink } from "@/lib/acoes";
import { ETAPAS } from "@/lib/conteudo";
import { ARQUIVOS_ETAPA, RELATORIOS } from "@/lib/relatorios";
import { buscarJornada, diasUteisDepois, marcarCheck, type ClienteJornada } from "@/lib/jornada";

// Apresentação do onboarding: a Claudia conduz a call com a cliente, tela a tela. Cria o acesso, manda o link,
// ensina a instalar o app, mostra cada etapa da trilha e já deixa o Diagnóstico com a Camilla marcado.

const PLANOS: Record<string, string> = { start: "Start", gold: "Gold", premium: "Premium", consultoria: "Consultoria" };
const primeiro = (n: string | null | undefined) => (n ?? "").trim().split(" ")[0] || "";

type Tela = { titulo: string; roteiro: string; corpo: React.ReactNode };

function Passos({ itens }: { itens: [string, string][] }) {
  return (
    <div className="grade g3" style={{ gap: 12 }}>
      {itens.map(([t, d], i) => (
        <div key={t} className="card card-borda" style={{ ["--c" as string]: "var(--red)", margin: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "var(--red)" }}>{i + 1}</div>
          <h3 style={{ margin: "4px 0" }}>{t}</h3>
          <p className="mudo" style={{ margin: 0 }}>{d}</p>
        </div>
      ))}
    </div>
  );
}

function Acesso({ c }: { c: ClienteJornada }) {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  if (!c.email) return <div className="aviso">Sem e-mail no portal. Preencha em <Link href={`/equipe/portal?id=${c.id}`}>Editar portal</Link> e volte aqui.</div>;
  return (
    <>
      <p style={{ fontSize: 17 }}>O seu acesso é pelo e-mail <b>{c.email}</b>. Você recebe um link, clica e cria a sua senha.</p>
      {link ? <LinkAcesso link={link} nome={c.responsavel ?? ""} whatsapp={c.whatsapp} /> : (
        <button type="button" className="btn p" disabled={gerando} onClick={async () => {
          setErro(""); setGerando(true);
          try { setLink(await gerarLink(c.email!, c.responsavel ?? "", c.id)); }
          catch (e) { setErro((e as Error).message); }
          setGerando(false);
        }}>{gerando ? "Gerando…" : "Gerar o link de acesso agora"}</button>
      )}
      {erro && <div className="aviso mt">{erro}</div>}
      <ol className="mt" style={{ fontSize: 16, lineHeight: 1.7 }}>
        <li>Abra o link no celular (é de uso único e vence em pouco tempo).</li>
        <li>Crie a sua senha.</li>
        <li>Pronto: você já está dentro do Hub da sua loja.</li>
      </ol>
    </>
  );
}

function Agendar({ c, nome, aoMudar }: { c: ClienteJornada; nome: string; aoMudar: () => void }) {
  const marcado = c.checks.get("diag_marcado");
  const [quando, setQuando] = useState(marcado?.marcado_para ? isoParaLocal(marcado.marcado_para) : "");
  const [msg, setMsg] = useState("");
  const prazo = diasUteisDepois(hoje(), 5);
  const site = typeof window !== "undefined" ? `${location.origin}${BASE}` : "";
  const resumo = `${primeiro(c.responsavel) || "Oi"}, que bom ter você com a gente! Resumo do nosso onboarding:

1. Entre no Hub (${site}/) e assista ao vídeo de boas-vindas em Comece aqui.
2. Preencha os Dados da loja, etapa por etapa. Não tem algum arquivo ou número? Escreva o que souber ou marque "Ainda não tenho".
3. Combinado: tudo enviado até ${dataCurta(prazo)}.${quando ? `\n4. Reunião de Diagnóstico com a Camilla: ${dataHora(localParaIso(quando))}.` : "\n4. Com tudo enviado, o Diagnóstico fica pronto em até 5 dias úteis e marcamos a reunião com a Camilla."}

Qualquer dúvida, é só chamar no Fale com a Camilla.`;
  return (
    <>
      <Passos itens={[
        ["Você envia tudo", `Combinado: as 8 etapas até ${dataCurta(prazo)}.`],
        ["A equipe monta", "O seu Diagnóstico fica pronto em até 5 dias úteis depois que você envia tudo."],
        ["Reunião com a Camilla", "1h30 para ver o Diagnóstico juntas e sair com o seu Plano de Ação."],
      ]} />
      <div className="card mt">
        <label className="rotulo" style={{ marginTop: 0 }}>Data da reunião de Diagnóstico com a Camilla</label>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} style={{ maxWidth: 240 }} />
          <button type="button" className="btn p peq" disabled={!quando} onClick={async () => {
            setMsg("");
            try {
              await marcarCheck(c.id, "diag_marcado", { feito: true, marcado_para: localParaIso(quando) }, nome);
              await marcarCheck(c.id, "onboarding", { feito: true }, nome);
              setMsg("Marcado ✓ O onboarding e a data do Diagnóstico já estão no checklist da Central.");
              aoMudar();
            } catch (e) { setMsg((e as Error).message); }
          }}>Marcar o Diagnóstico</button>
        </div>
        <p className="ajuda">Confira a agenda da Camilla antes de fechar a data. Ainda sem data? Feche o onboarding sem ela e marque quando os dados chegarem.</p>
        {!quando && <button type="button" className="link-loja" onClick={async () => { try { await marcarCheck(c.id, "onboarding", { feito: true }, nome); setMsg("Onboarding marcado como feito ✓"); aoMudar(); } catch (e) { setMsg((e as Error).message); } }}>Fechar o onboarding sem data</button>}
        {msg && <div className="aviso ok mt">{msg}</div>}
      </div>
      <div className="card mt">
        <b>Resumo para mandar no grupo dela</b>
        <p style={{ whiteSpace: "pre-wrap", background: "var(--soft)", borderRadius: 10, padding: 10, fontSize: 14 }}>{resumo}</p>
        <Copiar texto={resumo} rotulo="Copiar o resumo" />
      </div>
    </>
  );
}

/** A etapa exatamente como ela aparece no portal (mesmas perguntas, botões e quadros de arquivo), para a cliente
 *  já conhecer a tela. Dá para digitar e clicar para mostrar: nada é salvo. */
function EspelhoEtapa({ etapa, posicao }: { etapa: (typeof ETAPAS)[number]; posicao: number }) {
  const lugares = [
    ...ARQUIVOS_ETAPA.filter((a) => a.etapa === etapa.numero).map((a) => ({ titulo: a.titulo, oque: a.oque, video: !!a.video })),
    ...(etapa.numero === 8 ? RELATORIOS.map((r) => ({ titulo: r.titulo, oque: r.oque, video: false })) : []),
  ];
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", border: "1px dashed var(--line)", borderRadius: 18, padding: "16px 18px", background: "var(--bg)" }}>
      <small className="mudo">Assim fica no seu Hub · Dados da loja</small>
      <h2 style={{ margin: "4px 0 2px" }}>{posicao}. {etapa.titulo}</h2>
      <p className="mudo" style={{ marginTop: 0 }}>{etapa.descricao}</p>
      {etapa.numero === 5 && (
        <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)" }}>
          <b>Sua equipe</b>
          <p className="ajuda" style={{ margin: "4px 0 8px" }}>Cadastre cada pessoa (nome e função) e mande para cada uma o link do teste de perfil. Ela responde no celular dela e o resultado aparece aqui.</p>
          <span className="btn s peq" style={{ pointerEvents: "none" }}>+ Cadastrar pessoa</span>
        </div>
      )}
      {lugares.length > 0 && (
        <div className="card mb card-borda" style={{ ["--c" as string]: "var(--red)" }}>
          <h3 style={{ marginTop: 0 }}>{etapa.numero === 8 ? "Os relatórios do seu sistema" : "Arquivos desta etapa"}</h3>
          {lugares.map((l) => (
            <div key={l.titulo} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <span className="selo espera" style={{ float: "right" }}>falta</span>
              <b>{l.titulo}</b>
              <div className="ajuda" style={{ margin: "2px 0 8px" }}>{l.oque}</div>
              <span className="btn s peq" style={{ pointerEvents: "none" }}>📎 {l.video ? "Subir o vídeo" : "Subir arquivo"}</span>
            </div>
          ))}
          <p className="ajuda" style={{ marginBottom: 0 }}>Não tem algum desses arquivos? Sem problema: escreva no formulário abaixo o que souber ou marque &quot;Ainda não tenho&quot;.</p>
        </div>
      )}
      <div className="card" style={{ margin: 0 }}>
        {etapa.campos.some((c) => c.dado) && <p className="ajuda" style={{ marginTop: 0 }}>Nos números, marque se é um dado que você tem, uma estimativa ou se ainda não tem. Nada trava: o que faltar vira tarefa no seu Plano.</p>}
        {etapa.campos.map((c) => <CampoEtapa key={c.id} c={c} r={{}} padrao="" />)}
        <div className="linha mt"><span className="btn p" style={{ pointerEvents: "none", opacity: 0.85 }}>Salvar etapa</span></div>
      </div>
    </div>
  );
}

/** O portal da cliente ao vivo, dentro de um celular na própria tela: a Claudia navega sem sair da apresentação. */
function PortalAoVivo({ portalId }: { portalId: string }) {
  const [aberto, setAberto] = useState(false);
  const url = `${BASE}/inicio/?verComoLoja=${portalId}`;
  return (
    <div className="mt">
      {!aberto ? (
        <button type="button" className="btn s" onClick={() => setAberto(true)}>👁 Mostrar o portal dela ao vivo</button>
      ) : (
        <div className="linha" style={{ gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 300, height: 600, borderRadius: 36, border: "10px solid #141210", overflow: "hidden", background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,.2)", flexShrink: 0 }}>
            <iframe src={url} title="Portal da cliente ao vivo" style={{ width: 390, height: 780, border: 0, transform: "scale(0.7436)", transformOrigin: "0 0" }} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <p style={{ marginTop: 0 }}>É exatamente o que ela vê no celular. Dá para tocar e navegar aqui mesmo.</p>
            <p className="ajuda">Só navegue: o que for salvo aqui fica na conta dela.</p>
            <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn s peq" onClick={() => window.open(url, "_blank", "noopener")}>Abrir em tela grande (aba nova)</button>
              <button type="button" className="link-loja" onClick={() => setAberto(false)}>Fechar o celular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Apresentacao() {
  const id = useSearchParams().get("id") ?? "";
  const { nome } = useEquipe();
  const { dados, recarregar } = useDados(async () => ({ c: (await buscarJornada(id))[0] ?? null }), [id]);
  const c = dados?.c ?? null;
  const [i, setI] = useState(0);
  const [roteiro, setRoteiro] = useState(false);
  // Tela cheia só dos slides (sem o menu da equipe), para compartilhar na call.
  const palco = useRef<HTMLDivElement>(null);

  const telas: Tela[] = !c ? [] : [
    {
      titulo: `Boas-vindas, ${primeiro(c.responsavel) || c.loja}!`,
      roteiro: "Apresente-se, conte que você é quem acompanha o dia a dia dela na mentoria e que hoje vocês vão deixar tudo pronto para o Diagnóstico com a Camilla.",
      corpo: (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontSize: 15, letterSpacing: 2, textTransform: "uppercase" }} className="mudo">Mentoria Loja Magnética{c.plano ? ` · Plano ${PLANOS[c.plano] ?? c.plano}` : ""}</div>
          <h1 style={{ fontSize: 44, margin: "14px 0" }}>{c.loja}</h1>
          <p style={{ fontSize: 20 }}>Hoje a gente deixa o seu Hub pronto e combina os próximos passos até a reunião de Diagnóstico com a Camilla.</p>
          <p className="mudo" style={{ fontSize: 16, marginTop: 24 }}>ATRAIR. VENDER. MULTIPLICAR.</p>
        </div>
      ),
    },
    {
      titulo: "Como vão ser os próximos dias",
      roteiro: "Mostre que é simples: ela preenche, a equipe monta e a Camilla apresenta. Reforce que nada trava: o que ela não tiver, escreve ou marca \"ainda não tenho\".",
      corpo: <Passos itens={[
        ["Você preenche os Dados da loja", "8 etapas no Hub, uma abre a outra. Leva poucos dias, no seu ritmo."],
        ["A equipe monta o seu Diagnóstico", "Em até 5 dias úteis depois que você envia tudo."],
        ["Reunião com a Camilla", "Vocês veem o Diagnóstico juntas e você sai com o Plano de Ação."],
      ]} />,
    },
    { titulo: "O seu acesso ao Hub", roteiro: "Gere o link agora, com ela na call, e mande no WhatsApp dela. Peça para ela abrir e criar a senha enquanto vocês conversam.", corpo: <Acesso c={c} /> },
    {
      titulo: "Transforme o Hub em aplicativo",
      roteiro: "Faça junto com ela, no celular dela. Depois de instalar, ela abre o Hub pelo ícone, como um app.",
      corpo: (
        <div className="grade g2" style={{ gap: 14 }}>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>iPhone</h3>
            <ol style={{ fontSize: 16, lineHeight: 1.8, margin: 0 }}>
              <li>Abra o Hub no <b>Safari</b>.</li>
              <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
              <li>Toque em <b>Adicionar à Tela de Início</b>.</li>
              <li>Toque em <b>Adicionar</b>. O ícone da magnética aparece na tela.</li>
            </ol>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Android</h3>
            <ol style={{ fontSize: 16, lineHeight: 1.8, margin: 0 }}>
              <li>Abra o Hub no <b>Chrome</b>.</li>
              <li>Toque nos <b>três pontinhos</b> lá em cima.</li>
              <li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
              <li>Confirme. O ícone da magnética aparece na tela.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      titulo: "O que você vê no Hub agora",
      roteiro: "Abra o portal dela ao vivo no celular da tela e passe pelo menu junto com ela. Explique que o resto do Hub abre quando o Diagnóstico sai. Só navegue: o que for salvo ali fica na conta dela.",
      corpo: (
        <>
          <div className="grade g3" style={{ gap: 12 }}>
            {[
              ["Comece aqui", "O vídeo de boas-vindas. Assista primeiro: ele abre os Dados da loja."],
              ["Dados da loja", "As 8 etapas, em ordem. É por aqui que você conta tudo da loja."],
              ["Estoque e relatórios", "Onde você sobe os relatórios do sistema."],
              ["Fale com a Camilla", "Para qualquer dúvida no caminho."],
              ["Início", "Mostra o seu próximo passo e quanto falta."],
              ["O resto do Hub", "Abre quando o seu Diagnóstico ficar pronto."],
            ].map(([t, d]) => <div key={t} className="card" style={{ margin: 0 }}><b>{t}</b><p className="mudo" style={{ margin: "4px 0 0" }}>{d}</p></div>)}
          </div>
          <PortalAoVivo portalId={c.id} />
        </>
      ),
    },
    ...ETAPAS.map((e, k) => {
      return {
        titulo: `Etapa ${k + 1} de ${ETAPAS.length} · ${e.titulo}`,
        roteiro: k === 0
          ? "Mostre como a etapa funciona: responde, salva e a próxima abre sozinha. Nos números, ela marca se tem o dado, se é estimativa ou se ainda não tem."
          : e.numero === 5 ? "Mostre o cadastro do time e o link do teste de perfil: cada pessoa responde no celular dela, e o resultado aparece no Hub."
          : e.numero === 8 ? "Se ela tem sistema, mostre a mensagem pronta para pedir os relatórios ao suporte. Se não tem, ela responde estimando."
          : "Passe pelo que é perguntado e combine o que ela já tem em mãos.",
        corpo: <EspelhoEtapa etapa={e} posicao={k + 1} />,
      };
    }),
    {
      titulo: "A cada etapa, a equipe acompanha",
      roteiro: "Conte que a equipe recebe um aviso a cada etapa enviada e que, se faltar algo, ela recebe uma mensagem só com o que falta.",
      corpo: <Passos itens={[
        ["Você salva a etapa", "A próxima abre na hora."],
        ["A equipe recebe o aviso", "A Camilla e a Claudia veem cada etapa e cada arquivo que chega."],
        ["Faltou algo?", "Você recebe uma mensagem só com o que falta. Nunca perguntamos de novo o que você já contou."],
      ]} />,
    },
    { titulo: "Próximo passo: o seu Diagnóstico", roteiro: "Combine a data de envio, marque a reunião com a Camilla e mande o resumo no grupo dela.", corpo: <Agendar c={c} nome={nome} aoMudar={recarregar} /> },
  ];

  const total = telas.length;
  const ir = useCallback((d: number) => setI((x) => Math.min(Math.max(x + d, 0), Math.max(total - 1, 0))), [total]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") ir(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ir]);

  if (!dados) return <Carregando />;
  if (!c) return <div className="card">Cliente não encontrada.</div>;
  const tela = telas[i];

  return (
    <div ref={palco} style={{ maxWidth: 980, margin: "0 auto", background: "var(--bg)", padding: 16, overflow: "auto" }}>
      <div className="linha entre mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <Link href={`/equipe/central/cliente?id=${c.id}`} className="link-loja">← {c.loja}</Link>
        <span className="linha" style={{ gap: 8 }}>
          <button type="button" className="btn s peq" onClick={() => setRoteiro((r) => !r)}>{roteiro ? "Esconder o roteiro" : "Ver o roteiro da Claudia"}</button>
          <button type="button" className="btn s peq" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : palco.current?.requestFullscreen?.())?.catch?.(() => {})}>Tela cheia</button>
        </span>
      </div>
      {roteiro && <div className="aviso mb" style={{ fontSize: 14 }}>🎙 <b>Roteiro:</b> {tela.roteiro} <small className="mudo">(esconda antes de compartilhar a tela)</small></div>}
      <div className="card" style={{ minHeight: 460, padding: "28px 32px" }}>
        <small className="mudo">{i + 1} de {total}</small>
        <h1 style={{ margin: "6px 0 18px" }}>{tela.titulo}</h1>
        {tela.corpo}
      </div>
      <div className="linha entre mt" style={{ gap: 8 }}>
        <button type="button" className="btn s" onClick={() => ir(-1)} disabled={i === 0}>← Voltar</button>
        <div className="linha" style={{ gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
          {telas.map((t, k) => (
            <button key={k} type="button" aria-label={t.titulo} title={t.titulo} onClick={() => setI(k)}
              style={{ width: 10, height: 10, borderRadius: 99, border: 0, padding: 0, cursor: "pointer", background: k === i ? "var(--red)" : "var(--line)" }} />
          ))}
        </div>
        <button type="button" className="btn p" onClick={() => ir(1)} disabled={i === total - 1}>Avançar →</button>
      </div>
      <p className="ajuda" style={{ textAlign: "center" }}>Use as setas do teclado para passar as telas.</p>
    </div>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Apresentacao /></Suspense>;
}
