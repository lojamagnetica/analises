import Link from "next/link";
import { Icone } from "@/components/Icone";
import { contextoPortal, personalizacao, primeiroNome } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora, mesAtual, MESES_ABREV } from "@/lib/formato";
import { MESES } from "@/lib/conteudo";

export const metadata = { title: "Início" };

const ATALHOS = [
  { href: "/assistente", rotulo: "Assistente", icone: "robot", cor: "var(--purple)" },
  { href: "/plano", rotulo: "Plano 90 dias", icone: "target", cor: "var(--red)" },
  { href: "/scripts", rotulo: "Scripts", icone: "chat", cor: "var(--blue)" },
  { href: "/planeje", rotulo: "Planeje", icone: "cal", cor: "var(--green)" },
  { href: "/kanban", rotulo: "Kanban", icone: "kanban", cor: "var(--orange)" },
  { href: "/metas", rotulo: "Metas", icone: "calc", cor: "var(--purple)" },
  { href: "/notas", rotulo: "Notas", icone: "note", cor: "var(--orange)" },
  { href: "/cursos", rotulo: "Cursos", icone: "play", cor: "var(--blue)" },
];

const TUDO = [
  { titulo: "Minha jornada", icone: "map", cor: "var(--purple)", itens: [["/jornada", "Os 7 passos"], ["/plano", "Plano de Ação"], ["/reunioes", "Reuniões"]] },
  { titulo: "Minha loja", icone: "folder", cor: "var(--red)", itens: [["/personalizacao", "Personalização"], ["/metas", "Metas e calculadora"], ["/clientes", "Gestão de clientes"], ["/estoque", "Giro de estoque"], ["/notas", "Notas"]] },
  { titulo: "Vendas e marketing", icone: "funnel", cor: "var(--orange)", itens: [["/scripts", "Scripts de venda"], ["/planeje", "PLANEJE AQUI"], ["/kanban", "Kanban de conteúdo"]] },
  { titulo: "Aprender", icone: "play", cor: "var(--blue)", itens: [["/cursos", "Cursos e gravações"], ["/duvidas", "Dúvidas entre encontros"], ["/assistente", "Assistente Magnética"]] },
];

export default async function Inicio() {
  const { portal, nome } = await contextoPortal();
  const supabase = await supabaseServer();
  const agora = new Date().toISOString();
  const mes = mesAtual();

  const [{ data: prox }, { data: plano }, { data: datas }, { data: passo }, pers] = await Promise.all([
    supabase.from("reunioes").select("titulo, data").eq("portal_id", portal.id).gte("data", agora).order("data").limit(1).maybeSingle(),
    supabase.from("plano_itens").select("feito").eq("portal_id", portal.id),
    supabase.from("datas_comerciais").select("dia, titulo").eq("mes", mes).order("dia", { nullsFirst: true }),
    supabase.from("jornada_passos").select("titulo").eq("numero", portal.passo_atual).maybeSingle(),
    personalizacao(portal.id),
  ]);

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.feito).length ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const etapa2 = pers.get(2)?.respostas;
  const quem = (typeof etapa2?.seu_nome === "string" && etapa2.seu_nome) || primeiroNome(nome);

  return (
    <>
      <div className="heroi mt">
        <div>
          <h1>Seja bem-vindo(a), {quem}! 🥂</h1>
          <p>Este é o seu PORTAL DA MENTORIA. Tudo da {portal.loja} em um lugar só.</p>
        </div>
        <div className="meet">
          <small>Próximo encontro no Meet</small>
          {prox ? (
            <>
              <b style={{ textTransform: "capitalize" }}>{dataHora(prox.data)}</b>
              <div style={{ opacity: 0.9 }}>{prox.titulo}</div>
            </>
          ) : (
            <b>Ainda sem data marcada</b>
          )}
          {portal.meet_url && (
            <div className="mt">
              <a className="btn b peq" href={portal.meet_url} target="_blank" rel="noopener">Entrar na sala</a>
            </div>
          )}
        </div>
      </div>

      <div className="secao">Seus atalhos</div>
      <div className="atalhos">
        {ATALHOS.map((a) => (
          <Link key={a.href} href={a.href} className="atalho" style={{ ["--c" as string]: a.cor }}>
            <span className="quadrado"><Icone nome={a.icone} /></span>
            {a.rotulo}
          </Link>
        ))}
      </div>

      <div className="grade g3 mt">
        <div className="card card-borda" style={{ ["--c" as string]: "var(--purple)" }}>
          <h3>Sua jornada</h3>
          <p className="mudo">Passo {portal.passo_atual} de 7 · {passo?.titulo}</p>
          <div className="barra"><i style={{ width: `${(portal.passo_atual / 7) * 100}%` }} /></div>
          <Link className="btn s peq mt" href="/jornada">Ver os 7 passos</Link>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--red)" }}>
          <h3>Plano de Ação 90 dias</h3>
          <p className="mudo">{total ? `${feitos} de ${total} tarefas feitas` : "Seu plano está sendo montado"}</p>
          <div className="barra"><i style={{ width: `${pct}%` }} /></div>
          <Link className="btn s peq mt" href="/plano">Abrir plano</Link>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--green)" }}>
          <h3>Datas de {MESES[mes].toLowerCase()}</h3>
          <p className="mudo">
            {(datas ?? []).map((d) => (d.dia ? `${d.titulo} (${d.dia}/${MESES_ABREV[mes]})` : d.titulo)).join(" · ") || "Sem datas cadastradas"}
          </p>
          <Link className="btn s peq" href={`/planeje/${mes}`}>Planejar {MESES[mes].toLowerCase()}</Link>
        </div>
      </div>

      <div className="secao">Tudo aqui na plataforma</div>
      <div className="card">
        <div className="tudo" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {TUDO.map((g) => (
            <div key={g.titulo}>
              <h3>
                <span className="quadrado" style={{ ["--c" as string]: g.cor }}><Icone nome={g.icone} /></span>
                {g.titulo}
              </h3>
              <div className="chips">
                {g.itens.map(([href, rotulo]) => (
                  <Link key={href} className="chip" href={href}>{rotulo}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
