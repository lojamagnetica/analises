"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListaObjetos, ListaTexto } from "@/components/Listas";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  OBJETIVOS, analiseInicial, analiseLiberar, analiseSalvar, buscarMetodoConteudo, caracteresBio, completar, type Analise,
} from "@/lib/instagram";

function Secao({ titulo, sub, children, aberta = false }: { titulo: string; sub?: string; children: React.ReactNode; aberta?: boolean }) {
  return (
    <details className="card mb" open={aberta}>
      <summary style={{ cursor: "pointer" }}><b style={{ fontSize: 16 }}>{titulo}</b>{sub && <span className="mudo" style={{ fontSize: 13.5 }}> · {sub}</span>}</summary>
      <div className="mt">{children}</div>
    </details>
  );
}

function Editor() {
  const id = useSearchParams().get("p") ?? "";
  const { abrirPortal } = useEquipe();
  const [a, setA] = useState<Analise | null>(null);
  const [aviso, setAviso] = useState<{ ok?: string; erro?: string }>({});
  const [mudou, setMudou] = useState(false);
  const [json, setJson] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [m, p, an, pers] = await Promise.all([
      buscarMetodoConteudo(),
      sb.from("portais").select("id, loja").eq("id", id).maybeSingle(),
      sb.from("loja_analise_perfil").select("*").eq("portal_id", id).maybeSingle(),
      sb.from("personalizacao").select("respostas").eq("portal_id", id).eq("etapa", 2).maybeSingle(),
    ]);
    const r = (pers.data?.respostas ?? {}) as Record<string, unknown>;
    return { m, portal: p.data as { id: string; loja: string } | null, linha: an.data as { status: string; dados: Partial<Analise>; liberada_em: string | null } | null, etapa2: { instagram: String(r.instagram ?? ""), cidade: String(r.cidade ?? "") } };
  }, [id]);

  useEffect(() => {
    if (!dados || a) return;
    setA(dados.linha ? completar(dados.m, dados.linha.dados) : analiseInicial(dados.m, dados.etapa2));
  }, [dados, a]);

  if (!dados || !a) return <Carregando />;
  if (!dados.portal) return <div className="card">Portal não encontrado. <Link href="/equipe/analises">Voltar</Link></div>;
  const { m, portal } = dados;
  const liberada = dados.linha?.status === "liberada";
  const set = <K extends keyof Analise>(k: K, v: Analise[K]) => { setA({ ...a, [k]: v }); setMudou(true); };
  const salvar = async () => {
    setAviso({});
    try { await analiseSalvar(portal.id, a); setMudou(false); setAviso({ ok: "Análise salva." }); recarregar(); } catch (e) { setAviso({ erro: (e as Error).message }); }
  };
  const bio = caracteresBio(a.bio);
  const rosto = a.reels.filter((r) => r.rosto), produto = a.reels.filter((r) => !r.rosto);
  const med = (xs: { views: number }[]) => (xs.length ? Math.round(xs.reduce((s, r) => s + r.views, 0) / xs.length) : 0);

  return (
    <>
      <Titulo voltar={{ href: "/equipe/analises", rotulo: "Análises de perfil" }} titulo={`Análise do Perfil · ${portal.loja}`}
        sub="Método Loja Magnética · Diagnóstico de Perfil. Quando liberada, abre o módulo de Conteúdo no portal da loja, com a programação montada a partir desta análise." />
      <div className="card mb card-borda" style={{ ["--c" as string]: liberada ? "var(--green)" : "var(--orange)", position: "sticky", top: 8, zIndex: 5 }}>
        <div className="linha entre">
          <div>
            <span className={`selo ${liberada ? "feito" : "alerta"}`}>{liberada ? `liberada em ${dataCurta(dados.linha?.liberada_em)}` : "rascunho: a loja ainda não vê"}</span>
            {mudou && <span className="mudo" style={{ marginLeft: 8, fontSize: 13 }}>alterações não salvas</span>}
          </div>
          <div className="linha" style={{ gap: 8 }}>
            <button className="btn p" type="button" onClick={salvar}>Salvar</button>
            <button className="btn s" type="button" onClick={async () => { await salvar(); abrirPortal(portal.id, "/conteudo"); }}>Ver como a loja vê</button>
            <button className={`btn ${liberada ? "s" : "p"}`} type="button" disabled={!a.bio.trim() || a.correcoes.length === 0} onClick={async () => {
              await analiseSalvar(portal.id, a); await analiseLiberar(portal.id, !liberada); setMudou(false);
              setAviso({ ok: liberada ? "Voltou para rascunho: a loja não vê mais." : "Liberada. O módulo de Conteúdo abriu no portal da loja." }); recarregar();
            }}>{liberada ? "Voltar para rascunho" : "Liberar para a loja"}</button>
          </div>
        </div>
        {aviso.ok && <div className="aviso ok mt">{aviso.ok}</div>}
        {aviso.erro && <div className="aviso mt">{aviso.erro}</div>}
        {!a.bio.trim() && <p className="ajuda">Para liberar: bio sugerida e pelo menos uma correção.</p>}
      </div>

      <Secao titulo="1. Capa" sub="dados da loja, vídeo e os 4 números" aberta>
        <div className="grade g4" style={{ gap: 12 }}>
          <div><label className="rotulo">Instagram</label><input type="text" value={a.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@loja" /></div>
          <div><label className="rotulo">Cidade</label><input type="text" value={a.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Recife-PE" /></div>
          <div><label className="rotulo">Nicho</label><input type="text" value={a.nicho} onChange={(e) => set("nicho", e.target.value)} /></div>
          <div><label className="rotulo">Data</label><input type="date" value={a.data} onChange={(e) => set("data", e.target.value)} /></div>
        </div>
        <label className="rotulo">Abertura (o que é a loja e o que vamos ajustar)</label>
        <textarea rows={2} value={a.lede} onChange={(e) => set("lede", e.target.value)} />
        <label className="rotulo">Vídeo da análise (link do YouTube, não listado)</label>
        <input type="url" value={a.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtu.be/..." />
        <div className="grade g4 mt" style={{ gap: 12 }}>
          <div><label className="rotulo">Destaques hoje</label><input type="text" value={a.numeros.destaques_de} onChange={(e) => set("numeros", { ...a.numeros, destaques_de: e.target.value })} placeholder="14" /></div>
          <div><label className="rotulo">Destaques sugeridos</label><input type="text" value={a.numeros.destaques_para} onChange={(e) => set("numeros", { ...a.numeros, destaques_para: e.target.value })} /></div>
          <div><label className="rotulo">Frequência de reels</label><input type="text" value={a.numeros.frequencia} onChange={(e) => set("numeros", { ...a.numeros, frequencia: e.target.value })} /></div>
          <div><label className="rotulo">Meta de views por reels</label><input type="text" value={a.numeros.meta_views} onChange={(e) => set("numeros", { ...a.numeros, meta_views: e.target.value })} /></div>
        </div>
      </Secao>

      <Secao titulo="2. Correções imediatas do perfil" sub={`${a.correcoes.length} correções · bio ${bio}/150`}>
        <ListaObjetos nomeItem="Correção" itens={a.correcoes} aoMudar={(v) => set("correcoes", v)} novo={() => ({ titulo: "", texto: "", prazo: "Fazer agora" })}
          campos={[{ k: "titulo", rotulo: "Título", largo: true }, { k: "texto", rotulo: "O que está e como corrigir", tipo: "area" }, { k: "prazo", rotulo: "Prazo", tipo: "opcoes", opcoes: ["Fazer agora", "Esta semana"] }]} />
        <label className="rotulo mt">Bio pronta para colar</label>
        <textarea rows={6} value={a.bio} onChange={(e) => set("bio", e.target.value)} placeholder={m.bio.linhas.join("\n")} style={{ fontFamily: "inherit" }} />
        <p className="ajuda" style={{ color: bio > m.bio.limite ? "var(--red)" : undefined }}>{bio} de {m.bio.limite} caracteres. {m.bio.regras.join(" ")}</p>
        <ListaTexto rotulo="Destaques sugeridos, na ordem da compra" valor={a.destaques} aoMudar={(v) => set("destaques", v)} linhas={7} />
      </Secao>

      <Secao titulo="3. O que os números dizem" sub={`${a.reels.length} reels · com rosto ${med(rosto)} × produto ${med(produto)}`}>
        <ListaObjetos nomeItem="Reels" itens={a.reels} aoMudar={(v) => set("reels", v)} novo={() => ({ nome: "", views: 0, rosto: true })}
          campos={[{ k: "nome", rotulo: "Do que é" }, { k: "views", rotulo: "Views", tipo: "numero" }, { k: "rosto", rotulo: "Com a pessoa no vídeo", tipo: "marcar" }]} />
        <label className="rotulo mt">Conclusão</label>
        <textarea rows={3} value={a.conclusao} onChange={(e) => set("conclusao", e.target.value)} placeholder={m.textos.rosto_conclusao} />
      </Secao>

      <Secao titulo="4. Antes vs Depois" sub={`${a.posts.length} de 6 posts`}>
        <ListaObjetos nomeItem="Post" itens={a.posts} aoMudar={(v) => set("posts", v)} novo={() => ({ titulo: "", views: "", acerto: false, errado: "", certo: "" })}
          campos={[{ k: "titulo", rotulo: "Post" }, { k: "views", rotulo: "Views (ex.: 278 views)" }, { k: "acerto", rotulo: "É um acerto (o que já está bom)", tipo: "marcar" },
            { k: "errado", rotulo: "O que estava errado / o que já está bom", tipo: "area" }, { k: "certo", rotulo: "Como deveria ser / o que melhorar", tipo: "area" }]} />
      </Secao>

      <Secao titulo="5. Certo vs Errado e estratégia">
        <div className="grade g2" style={{ gap: 16 }}>
          <div><ListaTexto rotulo="Pare de fazer" valor={a.pare} aoMudar={(v) => set("pare", v)} linhas={8} /></div>
          <div><ListaTexto rotulo="Comece a fazer" valor={a.comece} aoMudar={(v) => set("comece", v)} linhas={8} /></div>
        </div>
        <div className="secao">Estratégia de conteúdo</div>
        <ListaObjetos nomeItem="Regra" itens={a.estrategia} aoMudar={(v) => set("estrategia", v)} novo={() => ({ emoji: "✨", titulo: "", texto: "" })}
          campos={[{ k: "emoji", rotulo: "Emoji" }, { k: "titulo", rotulo: "Título" }, { k: "texto", rotulo: "Texto", tipo: "area" }]} />
      </Secao>

      <Secao titulo="6. Roteiros-modelo" sub="até 30 segundos · [entre colchetes] vira campo para a loja preencher">
        <ListaObjetos nomeItem="Roteiro" itens={a.roteiros} aoMudar={(v) => set("roteiros", v)}
          novo={() => ({ id: `proprio-${Date.now()}`, nome: "", formato: "Reels", objetivo: "Atrair" as const, quando: "", linhas: [{ rotulo: "Gancho", fala: "", nota: "" }, { rotulo: "CTA", fala: "", nota: "" }] })}
          campos={[{ k: "nome", rotulo: "Nome" }, { k: "quando", rotulo: "Quando usar" }, { k: "formato", rotulo: "Formato", tipo: "opcoes", opcoes: m.formatos.concat("Stories + Reels") }, { k: "objetivo", rotulo: "Objetivo", tipo: "opcoes", opcoes: OBJETIVOS }]}
          extra={(r, i) => (
            <div className="mt">
              <label className="rotulo">Linhas (uma por linha: Rótulo | fala | nota de gravação)</label>
              <textarea rows={5} value={r.linhas.map((l) => [l.rotulo, l.fala, l.nota].join(" | ")).join("\n")}
                onChange={(e) => set("roteiros", a.roteiros.map((x, j) => (j === i ? { ...x, linhas: e.target.value.split("\n").map((t) => { const [rotulo = "", fala = "", nota = ""] = t.split("|").map((s) => s.trim()); return { rotulo, fala, nota }; }) } : x)))} />
            </div>
          )} />
        <p className="ajuda">Mais modelos do método ficam disponíveis para a loja no gerador de roteiro: {m.roteiros.filter((r) => !a.roteiros.some((x) => x.id === r.id)).map((r) => r.nome).join(", ")}.</p>
      </Secao>

      <Secao titulo="7. Ganchos, ideias e CTAs">
        <ListaTexto rotulo="Fórmulas de gancho prontas" valor={a.ganchos} aoMudar={(v) => set("ganchos", v)} linhas={7} />
        <div className="secao">Banco de ideias</div>
        <ListaObjetos nomeItem="Ideia" itens={a.ideias} aoMudar={(v) => set("ideias", v)} novo={() => ({ formato: "Reels", objetivo: "Atrair" as const, titulo: "", texto: "" })}
          campos={[{ k: "formato", rotulo: "Formato", tipo: "opcoes", opcoes: m.formatos.concat("Bastidor", "Prova social") }, { k: "objetivo", rotulo: "Objetivo", tipo: "opcoes", opcoes: OBJETIVOS }, { k: "titulo", rotulo: "Título", largo: true }, { k: "texto", rotulo: "Como fazer", tipo: "area" }]} />
        <div className="secao">CTAs por situação</div>
        <ListaObjetos nomeItem="CTA" itens={a.ctas} aoMudar={(v) => set("ctas", v)} novo={() => ({ situacao: "", fala: "", porque: "" })}
          campos={[{ k: "situacao", rotulo: "Situação" }, { k: "fala", rotulo: "O que falar", largo: true }, { k: "porque", rotulo: "Por quê", tipo: "area" }]} />
      </Secao>

      <Secao titulo="8. Rotina e cronograma">
        <ListaObjetos nomeItem="Passo" itens={a.workflow} aoMudar={(v) => set("workflow", v)} novo={() => ({ titulo: "", texto: "" })} campos={[{ k: "titulo", rotulo: "Passo" }, { k: "texto", rotulo: "Como", tipo: "area" }]} />
        <ListaTexto rotulo="Ferramentas recomendadas" valor={a.ferramentas} aoMudar={(v) => set("ferramentas", v)} linhas={6} />
        <div className="secao">Cronograma de execução</div>
        <ListaObjetos nomeItem="Etapa" itens={a.cronograma} aoMudar={(v) => set("cronograma", v)} novo={() => ({ quando: "", titulo: "", texto: "" })}
          campos={[{ k: "quando", rotulo: "Quando" }, { k: "titulo", rotulo: "Título" }, { k: "texto", rotulo: "O que fazer", tipo: "area" }]} />
      </Secao>

      <details className="card mb">
        <summary style={{ cursor: "pointer" }}><b>Colar análise pronta (JSON)</b> <span className="mudo" style={{ fontSize: 13.5 }}>· quando a análise foi montada com o Claude</span></summary>
        <p className="ajuda">Cole o JSON com os mesmos campos desta tela. O que vier substitui o que está aqui; o que não vier fica como está. Confira e salve.</p>
        <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"bio": "...", "correcoes": [...], "reels": [...], "posts": [...]}' />
        <button className="btn s peq mt" type="button" onClick={() => {
          try { const d = JSON.parse(json) as Partial<Analise>; setA(completar(m, { ...a, ...d })); setMudou(true); setJson(""); setAviso({ ok: "Análise colada. Confira e salve." }); }
          catch { setAviso({ erro: "Esse texto não é um JSON válido." }); }
        }}>Usar este JSON</button>
      </details>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Editor /></Suspense>;
}
