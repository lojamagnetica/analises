"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LinkAcesso } from "@/components/LinkAcesso";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { dataCurta, hoje } from "@/lib/formato";
import { gerarLink } from "@/lib/acoes";
import { ETAPAS } from "@/lib/conteudo";
import { buscarJornada, diasUteisDepois, marcarCheck, type ClienteJornada } from "@/lib/jornada";

// Apresentação do onboarding: a Claudia conduz a call com a cliente, tela a tela. Cria o acesso, manda o link,
// ensina a instalar o app, mostra cada etapa da trilha e já deixa o Diagnóstico com a Camilla marcado.

const PLANOS: Record<string, string> = { start: "Start", gold: "Gold", premium: "Premium", consultoria: "Consultoria" };
const primeiro = (n: string | null | undefined) => (n ?? "").trim().split(" ")[0] || "";
/** O nome da loja (o que o Comercial anotou como loja mentorada); o cadastro do portal às vezes tem o nome da pessoa. */
const nomeDaLoja = (c: ClienteJornada) => c.passagem?.lojas_mentoradas?.trim() || c.loja;

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

/** Fechamento: combina o prazo de envio. A reunião com a Camilla só é marcada depois que tudo chega sem pendência. */
function Fechar({ c, nome, aoMudar }: { c: ClienteJornada; nome: string; aoMudar: () => void }) {
  const salvo = c.checks.get("onboarding");
  const [prazo, setPrazo] = useState(salvo?.marcado_para?.slice(0, 10) ?? diasUteisDepois(hoje(), 5));
  const [msg, setMsg] = useState("");
  return (
    <>
      <Passos itens={[
        ["Você envia tudo", `Combinado: as 8 etapas até ${dataCurta(prazo)}.`],
        ["A equipe confere e monta", "Com tudo recebido e sem pendências, o seu Diagnóstico fica pronto em até 5 dias úteis."],
        ["Reunião com a Camilla", "Marcamos com você assim que o Diagnóstico estiver pronto: 1h30 para ver tudo juntas e sair com o seu Plano de Ação."],
      ]} />
      <div className="card mt">
        <label className="rotulo" style={{ marginTop: 0 }}>Até quando você envia tudo</label>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={{ maxWidth: 200 }} />
          <button type="button" className="btn p peq" disabled={!prazo} onClick={async () => {
            setMsg("");
            try {
              await marcarCheck(c.id, "onboarding", { feito: true, marcado_para: `${prazo}T12:00:00-03:00`, obs: `Prazo de envio combinado: ${dataCurta(prazo)}` }, nome);
              setMsg("Combinado ✓");
              aoMudar();
            } catch (e) { setMsg((e as Error).message); }
          }}>Combinar este prazo</button>
        </div>
        <p className="ajuda">A reunião com a Camilla é marcada assim que tudo chegar completo, sem pendências.</p>
        {msg && <div className="aviso ok mt">{msg}</div>}
      </div>
    </>
  );
}

/** Visão geral do que a loja ganha depois do Diagnóstico, por área, e de que dado cada parte depende. */
const AREAS: { area: string; vem: string; itens: string[] }[] = [
  { area: "Diagnóstico", vem: "Todos os Dados da loja e os relatórios", itens: ["Diagnóstico da loja: os números, os alertas e o foco", "Diagnóstico de estoque: o que gira e o que está parado", "Análise do Instagram"] },
  { area: "Minha mentoria", vem: "O Diagnóstico e os seus objetivos", itens: ["Plano de Ação 90 dias, mês a mês", "Os 7 passos da mentoria", "Reuniões, gravações e notas"] },
  { area: "Gestão estratégica", vem: "Faturamento, estoque e crediário", itens: ["Fechamento de caixa do dia", "Resultado do mês", "Metas e calculadora"] },
  { area: "Gestão de pessoas", vem: "O time e o teste de perfil", itens: ["Minha equipe e o perfil de cada pessoa", "Reuniões prontas (semanal e do mês) e Dar retorno", "Desenvolvimento, gincanas, contratação e organograma"] },
  { area: "Vendas", vem: "Mix, preços e o que mais vende", itens: ["Ações do Mês", "Planeje aqui: o planejamento do mês"] },
  { area: "De cliente a fã", vem: "O cadastro de clientes", itens: ["Minhas clientes, com a carteira de cada vendedora", "Missão da semana e resgate de clientes", "Campanhas e experiência da cliente"] },
  { area: "Conteúdo", vem: "Instagram, cliente ideal e inspirações", itens: ["Programação da semana e pautas quentes", "Criar roteiro e Link da Bio", "Resultados do Instagram"] },
  { area: "E mais", vem: "Tudo o que você contar", itens: ["Planner de gestão, com a rotina da sua loja", "Curso", "Mural e Nossa marca (abre na semana depois do Diagnóstico)"] },
];
function Ferramentas() {
  return (
    <>
      <p style={{ fontSize: 17, marginTop: 0 }}>Cada resposta que você dá vira uma ferramenta pronta para a sua loja. As principais abrem quando o seu Diagnóstico ficar pronto. Conteúdo e Nossa marca a Camilla libera aos poucos, a cada 15 dias, quando fizerem sentido para a etapa da sua loja.</p>
      <div className="grade g4" style={{ gap: 10 }}>
        {AREAS.map((a) => (
          <div key={a.area} className="card card-borda" style={{ ["--c" as string]: "var(--red)", margin: 0, padding: 14 }}>
            <b>{a.area}</b>
            <ul style={{ margin: "6px 0", paddingLeft: 16, fontSize: 13.5, lineHeight: 1.5 }}>{a.itens.map((i) => <li key={i}>{i}</li>)}</ul>
            <small className="mudo">Vem de: {a.vem}</small>
          </div>
        ))}
      </div>
    </>
  );
}

/** A tela de verdade do portal da cliente (menu, topo e página), do tamanho de um computador, encaixada no slide.
 *  Fica em modo demonstração: as etapas abrem todas e nada é salvo. */
function TelaDoPortal({ portalId, caminho }: { portalId: string; caminho: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.7);
  const L = 1360, A = 860;
  useEffect(() => {
    const medir = () => { const w = caixa.current?.clientWidth ?? 0; if (w) setEscala(Math.min(1, w / L)); };
    medir();
    const ro = new ResizeObserver(medir);
    if (caixa.current) ro.observe(caixa.current);
    return () => ro.disconnect();
  }, []);
  const sep = caminho.includes("?") ? "&" : "?";
  const url = `${BASE}${caminho}${sep}verComoLoja=${portalId}&demo=1`;
  return (
    <div ref={caixa} style={{ width: "100%", height: A * escala, overflow: "hidden", borderRadius: 14, border: "1px solid var(--line)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", background: "#fff" }}>
      <iframe key={url} src={url} title="Tela do portal" style={{ width: L, height: A, border: 0, transform: `scale(${escala})`, transformOrigin: "0 0" }} />
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

/** Sem cliente escolhida: lista as lojas ativas para a Claudia abrir a apresentação da cliente da call. */
function Escolher() {
  const { dados } = useDados(() => buscarJornada(), []);
  const [busca, setBusca] = useState("");
  if (!dados) return <Carregando />;
  const t = busca.trim().toLowerCase();
  const lista = dados.filter((c) => !t || `${c.loja} ${c.responsavel ?? ""}`.toLowerCase().includes(t));
  return (
    <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Onboarding · para quem é a call?</h2>
      <p className="mudo">A apresentação é a mesma para todas as lojas. Escolha a cliente e, na tela, você ainda troca o nome na hora.</p>
      <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pela loja ou pelo nome" />
      <div className="mt" style={{ display: "grid", gap: 6 }}>
        {lista.map((c) => <Link key={c.id} className="btn s" href={`/equipe/central/onboarding?id=${c.id}`} style={{ justifyContent: "flex-start" }}>{c.loja}{c.responsavel ? ` · ${c.responsavel}` : ""}</Link>)}
        {lista.length === 0 && <p className="mudo">Nenhuma loja encontrada.</p>}
      </div>
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
  // Nomes que aparecem nos slides: vêm do cadastro, mas a Claudia troca na hora (quem está na call, nome da loja).
  const [nomePessoa, setNomePessoa] = useState("");
  const [nomeLoja, setNomeLoja] = useState("");
  const cId = c?.id;
  useEffect(() => {
    if (!c) return;
    setNomePessoa(primeiro(c.responsavel));
    setNomeLoja(nomeDaLoja(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cId]);
  // Tela cheia só dos slides (sem o menu da equipe), para compartilhar na call.
  const palco = useRef<HTMLDivElement>(null);

  const telas: Tela[] = !c ? [] : [
    {
      titulo: `Boas-vindas, ${nomePessoa.trim() || nomeLoja.trim()}!`,
      roteiro: "Apresente-se, conte que você é quem acompanha o dia a dia dela na mentoria e que hoje vocês vão deixar tudo pronto para o Diagnóstico com a Camilla.",
      corpo: (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontSize: 15, letterSpacing: 2, textTransform: "uppercase" }} className="mudo">Mentoria Loja Magnética{c.plano ? ` · Plano ${PLANOS[c.plano] ?? c.plano}` : ""}</div>
          <h1 style={{ fontSize: 44, margin: "14px 0" }}>{nomeLoja}</h1>
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
      roteiro: "Esta é a tela real do portal dela. Passe pelo menu e mostre o Início. Se quiser, abra também no celular (botão abaixo). O resto do Hub abre quando o Diagnóstico sai.",
      corpo: (
        <>
          <TelaDoPortal portalId={c.id} caminho="/inicio/" />
          <p className="mudo mt" style={{ marginBottom: 0 }}>Agora você vê o Início, o Comece aqui (com o vídeo de boas-vindas), o Fale com a Camilla e a sua loja: Dados da loja e Estoque e relatórios. O resto do Hub abre quando o seu Diagnóstico ficar pronto.</p>
          <PortalAoVivo portalId={c.id} />
        </>
      ),
    },
    {
      titulo: "Como usar o Hub no dia a dia",
      roteiro: "Mostre no celular ao vivo (tela anterior) onde fica cada coisa: o menu, o Início e o Fale com a Camilla.",
      corpo: (
        <div className="grade g3" style={{ gap: 12 }}>
          {[
            ["☰ Menu", "No celular, o menu abre no botão do canto de cima. Cada área tem as suas ferramentas dentro."],
            ["🏠 Início", "Sempre mostra o seu próximo passo, o que falta e o seu próximo encontro."],
            ["🔍 Busca", "Digite o nome do que procura (ex.: metas, clientes) e vá direto."],
            ["💬 Fale com a Camilla", "Dúvidas e pedidos para a equipe. A resposta chega no próprio Hub."],
            ["🟠 Ponto laranja", "Mostra onde ainda falta algo seu. Some quando você completa."],
            ["❓ Como usar o Hub", "Um guia rápido, no fim do menu, sempre que precisar."],
          ].map(([t, d]) => <div key={t} className="card" style={{ margin: 0 }}><b>{t}</b><p className="mudo" style={{ margin: "4px 0 0" }}>{d}</p></div>)}
        </div>
      ),
    },
    {
      titulo: "Como você é atendida",
      roteiro: "Deixe bem claro, antes de ela começar a mandar mensagem: a Camilla responde duas vezes ao dia, conforme a agenda dela, e o suporte responde em horário comercial. Assim ela sabe quando esperar a resposta e nada fica sem retorno.",
      corpo: <Passos itens={[
        ["Camilla responde 2 vezes ao dia", "Ela responde as mensagens enviadas pelo Hub de acordo com a agenda dela, para garantir a excelência em cada resposta."],
        ["O suporte responde no horário comercial", "A qualquer momento do dia, durante o horário comercial."],
        ["E aos sábados até as 13h", "Mandou no sábado de manhã? O suporte responde até as 13h."],
      ]} />,
    },
    {
      titulo: "Segunda-feira é o dia da devolutiva",
      roteiro: "Explique o combinado com calma: toda segunda a mentora analisa todas as lojas que estão com o Hub atualizado e dá o retorno sobre a estratégia da semana. Se o Hub não estiver atualizado na segunda, a loja só recebe a devolutiva na segunda seguinte, desde que já esteja em dia. É isso que garante a excelência operacional da mentoria.",
      corpo: <Passos itens={[
        ["Toda segunda, a análise", "A mentora analisa todas as lojas que estão com o Hub atualizado."],
        ["Você recebe a estratégia da semana", "O retorno vem sobre a estratégia da semana da sua loja."],
        ["Hub desatualizado na segunda?", "A devolutiva fica para a próxima segunda, se já estiver tudo em dia. Isso garante a excelência operacional da mentoria."],
      ]} />,
    },
    {
      titulo: "Seu acesso à Carteira Ativa",
      roteiro: "Conte que todos os planos incluem o acesso à Carteira Ativa, que fica na plataforma Hubla. Combine com ela o e-mail que ela quer usar no acesso e libere na Hubla. Depois, marque no checklist da Central: \"Acesso à Carteira Ativa liberado\".",
      corpo: <Passos itens={[
        ["Está incluso no seu plano", "Todos os planos da mentoria têm o acesso à Carteira Ativa."],
        ["Fica na plataforma Hubla", "É lá que você assiste e acompanha o conteúdo da Carteira Ativa."],
        ["A Claudia libera o seu acesso", "Durante o onboarding, com o e-mail que você escolher."],
      ]} />,
    },
    ...ETAPAS.map((e, k) => {
      return {
        titulo: `Etapa ${k + 1} de ${ETAPAS.length} · ${e.titulo}`,
        roteiro: (k === 0
          ? "Mostre como a etapa funciona: responde, salva e a próxima abre sozinha. Nos números, ela marca se tem o dado, se é estimativa ou se ainda não tem."
          : e.numero === 5 ? "Mostre o cadastro do time e o link do teste de perfil: cada pessoa responde no celular dela, e o resultado aparece no Hub."
          : e.numero === 8 ? "Se ela tem sistema, mostre a mensagem pronta para pedir os relatórios ao suporte. Se não tem, ela responde estimando."
          : "Passe pelo que é perguntado e combine o que ela já tem em mãos.") + " A tela é a do portal dela, em demonstração: dá para clicar e digitar, nada é salvo.",
        corpo: <TelaDoPortal portalId={c.id} caminho={`/personalizacao/etapa/?n=${e.numero}`} />,
      };
    }),
    {
      titulo: "O que abre com os seus dados bem preenchidos",
      roteiro: "Passe rápido, sem aprofundar: o objetivo é ela ver que cada resposta vira uma ferramenta. Quanto mais completo, mais certeiro fica tudo.",
      corpo: <Ferramentas />,
    },
    {
      titulo: "A cada etapa, a equipe acompanha",
      roteiro: "Conte que a equipe recebe um aviso a cada etapa enviada e que, se faltar algo, ela recebe uma mensagem só com o que falta.",
      corpo: <Passos itens={[
        ["Você salva a etapa", "A próxima abre na hora."],
        ["A equipe recebe o aviso", "A Camilla e a Claudia veem cada etapa e cada arquivo que chega."],
        ["Faltou algo?", "Você recebe uma mensagem só com o que falta. Nunca perguntamos de novo o que você já contou."],
      ]} />,
    },
    { titulo: "Próximo passo: enviar tudo", roteiro: "Combine com ela o prazo para enviar tudo e clique em Combinar este prazo (isso conclui o onboarding no checklist). Depois da call, copie o resumo na Central do Cliente e mande no grupo dela. A reunião com a Camilla é marcada só quando tudo chegar sem pendência.", corpo: <Fechar c={c} nome={nome} aoMudar={recarregar} /> },
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

  if (!id) return <Escolher />;
  if (!dados) return <Carregando />;
  if (!c) return <div className="card">Cliente não encontrada. <Link href="/equipe/central/onboarding">Escolher outra</Link></div>;
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
      <div className="card mb" style={{ padding: "10px 14px" }}>
        <div className="linha" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}><label className="rotulo" style={{ marginTop: 0 }}>Nome de quem está na call</label><input type="text" value={nomePessoa} onChange={(e) => setNomePessoa(e.target.value)} placeholder="Ex.: Camila" /></div>
          <div style={{ flex: "1 1 200px" }}><label className="rotulo" style={{ marginTop: 0 }}>Nome da loja</label><input type="text" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} placeholder="Ex.: Boutique Rosa" /></div>
          <Link href="/equipe/central/onboarding" className="link-loja">Trocar de cliente</Link>
        </div>
        <p className="ajuda" style={{ margin: "6px 0 0" }}>Os nomes vêm do cadastro. Pode trocar aqui na hora: muda só nos slides, não no cadastro.</p>
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
