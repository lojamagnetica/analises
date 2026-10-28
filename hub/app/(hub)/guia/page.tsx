"use client";

import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Titulo } from "@/components/Titulo";
import { grupos } from "@/components/Menu";
import { usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { GUIA } from "@/lib/guia";
import { NOME_REQUISITO, PRAZO_DIAGNOSTICO, dadosCompletos, liberado, prazoDiagnostico, requisito, type Entrada } from "@/lib/entrada";

type Estado = "feito" | "aberto" | "fechado";
type PassoGuia = { titulo: string; href: string; estado: Estado; nota: string };

/** A jornada real da loja, lida do mesmo Entrada dos cadeados. */
function primeirosPassos(e: Entrada | null, persFaltam: number): PassoGuia[] {
  const livre = !e || e.livre;
  const video = livre || e.video;
  const enviado = !!e && dadosCompletos(e);
  const diag = livre || e.diagnostico;
  const estado = (feito: boolean, aberto: boolean): Estado => (feito ? "feito" : aberto ? "aberto" : "fechado");
  return [
    { titulo: "Assistir ao vídeo de boas-vindas", href: "/comece", estado: estado(!!e?.video, true), nota: "Explica como a mentoria funciona." },
    {
      titulo: "Preencher os Dados da loja", href: "/personalizacao", estado: estado(!!e?.loja, video),
      nota: video ? (e?.loja ? "Todas as etapas respondidas." : `Falta${persFaltam > 1 ? "m" : ""} ${persFaltam} etapa${persFaltam > 1 ? "s" : ""}.`) : "Abre quando você assistir ao vídeo.",
    },
    {
      titulo: "Cadastrar a sua equipe", href: "/personalizacao/etapa?n=5", estado: estado(!!e?.equipe, video),
      nota: video ? (e?.equipe ? `${e.pessoas} pessoa${e.pessoas > 1 ? "s" : ""} no time.` : "Na etapa Time de vendas, com o teste de perfil.") : "Abre quando você assistir ao vídeo.",
    },
    {
      titulo: "Receber o seu Diagnóstico", href: "/painel", estado: estado(!!e?.diagnostico, false),
      nota: e?.diagnostico ? `Liberado em ${dataCurta(e.diagnosticoEm)}.`
        : enviado && e?.dadosEm ? `A equipe está montando. Fica pronto até ${dataCurta(prazoDiagnostico(e.dadosEm))}.`
        : `Fica pronto em até ${PRAZO_DIAGNOSTICO} dias úteis depois que você mandar tudo.`,
    },
    {
      titulo: "Seguir o Plano de Ação e usar as ferramentas", href: "/plano", estado: estado(false, diag),
      nota: diag ? "O Plano, Vendas, Clientes, Pessoas e Conteúdo já estão abertos." : "Abre junto com o Diagnóstico.",
    },
  ];
}

const SELO: Record<Estado, { rotulo: string; classe: string }> = {
  feito: { rotulo: "✅ feito", classe: "feito" },
  aberto: { rotulo: "🔓 aberto agora", classe: "andamento" },
  fechado: { rotulo: "🔒 abre depois", classe: "espera" },
};

export default function Guia() {
  const { portal, entrada, equipe, persFaltam } = usePortal();
  const consultoria = portal.tipo === "Consultoria";
  // A loja vê os cadeados; a equipe vê tudo aberto (a jornada mostra onde a loja está).
  const ent = equipe ? null : entrada;
  const passos = primeirosPassos(entrada, persFaltam);
  const lista = [
    ...grupos(false, true, persFaltam, consultoria, false, false, portal.canais ?? []),
    { id: "mais", rotulo: "Curso e indicação", icone: "play", itens: [{ href: "/cursos", rotulo: "Curso", icone: "play" }, { href: "/indique", rotulo: "Indique uma loja 🎁", icone: "gift" }] },
  ];

  const quando = (href: string) => {
    const r = requisito(href.split("?")[0]);
    if (!r) return { aberta: true, texto: "Sempre aberta" };
    if (!ent || liberado(r, ent)) return { aberta: true, texto: "Aberta" };
    return { aberta: false, texto: `🔒 Abre quando você ${NOME_REQUISITO[r]}` };
  };

  return (
    <>
      <Titulo titulo="Como usar o Hub" sub="O caminho da sua loja aqui dentro e o que cada página faz." />

      <div className="card card-borda mb" style={{ ["--c" as string]: "var(--red)" }}>
        <h2 style={{ marginTop: 0 }}>Seus primeiros passos</h2>
        {passos.map((p, i) => (
          <div key={p.href} className="marcar" style={{ cursor: "default", gap: 12, alignItems: "center" }}>
            <span className={`selo ${SELO[p.estado].classe}`} style={{ minWidth: 34, textAlign: "center" }}>{p.estado === "feito" ? "✓" : i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{p.titulo}</b>
              <div className="mudo" style={{ fontSize: 13 }}>{SELO[p.estado].rotulo} · {p.nota}</div>
            </div>
            {p.estado === "aberto" && <Link className="btn p peq" href={p.href}>Fazer agora →</Link>}
          </div>
        ))}
      </div>

      {(() => {
        // O que chegou de novo: só as páginas que esta loja tem no menu.
        const novos = lista.flatMap((g) => g.itens).filter((i) => GUIA[i.href]?.novo);
        if (!novos.length) return null;
        return (
          <div className="card mb" style={{ background: "var(--grad)", color: "var(--side-text)" }}>
            <h2 style={{ marginTop: 0, color: "inherit" }}>✨ O que chegou de novo no Hub</h2>
            <div className="grade" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {novos.map((i) => (
                <Link key={i.href} href={i.href} style={{ color: "inherit", textDecoration: "none", background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 12, display: "block" }}>
                  <b className="linha" style={{ gap: 8 }}><Icone nome={i.icone} tamanho={18} /> {i.rotulo}</b>
                  <small style={{ opacity: 0.8 }}>{GUIA[i.href].oque.split(":")[0].split(".")[0]}</small>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="chips mb">
        {lista.map((g) => <a key={g.id} className="chip" href={`#${g.id}`}>{g.rotulo}</a>)}
      </div>

      {lista.map((g) => (
        <section key={g.id} id={g.id}>
          <div className="secao">{g.rotulo}</div>
          <div className="grade g3 mb">
            {g.itens.map((i) => {
              const t = GUIA[i.href];
              const q = quando(i.href);
              return (
                <div key={i.href} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="linha entre" style={{ gap: 6 }}>
                    <b className="linha" style={{ gap: 8 }}><Icone nome={i.icone} tamanho={18} /> {i.rotulo}{t?.novo && <span className="selo alerta" style={{ fontSize: 10.5 }}>Novo</span>}</b>
                    <span className={`selo ${q.aberta ? "feito" : "espera"}`} style={{ fontSize: 11 }}>{q.aberta ? q.texto : "🔒 fechada"}</span>
                  </div>
                  {t && <p style={{ margin: 0, fontSize: 14 }}>{t.oque}</p>}
                  {t && t.passos.length > 0 && (
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5 }} className="mudo">
                      {t.passos.map((p) => <li key={p}>{p}</li>)}
                    </ol>
                  )}
                  {!q.aberta && <small className="mudo">{q.texto}.</small>}
                  <Link href={i.href} style={{ marginTop: "auto", fontWeight: 700, fontSize: 14 }}>abrir →</Link>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="secao">Ficou com dúvida?</div>
      <div className="grade g2">
        <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
          <h3 style={{ marginTop: 0 }}>Fale com a Camilla</h3>
          <p className="mudo">Escreva ou mande um áudio com a sua dúvida, pedido ou aviso. A equipe responde em até 12 horas úteis.</p>
          <Link className="btn p peq" href="/assistente">Abrir o Fale com a Camilla →</Link>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--blue)" }}>
          <h3 style={{ marginTop: 0 }}>Assistente sempre à mão</h3>
          <p className="mudo">Em qualquer página, o botão redondo escuro no alto da tela (<Icone nome="chat" tamanho={14} />) abre a conversa com a equipe. A busca do menu (<Icone nome="search" tamanho={14} />) acha qualquer página pelo nome.</p>
          <Link className="btn s peq" href="/inicio">Voltar para o Início</Link>
        </div>
      </div>
    </>
  );
}
