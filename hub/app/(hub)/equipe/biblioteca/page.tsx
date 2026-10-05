import { Titulo } from "@/components/Titulo";
import { contextoEquipe } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { MESES_PLANO } from "@/lib/conteudo";
import { aulaApagar, aulaSalvar, modeloAdicionar, modeloApagar, passoSalvar, scriptApagar, scriptSalvar } from "../acoes";

export const metadata = { title: "Biblioteca" };

type Script = { id: string; categoria: string; titulo: string; quando: string; texto: string; ordem: number };
type Aula = { id: string; modulo: string; titulo: string; descricao: string; video_url: string | null; ordem: number };

function CamposScript({ s, categorias }: { s?: Script; categorias: { id: string; titulo: string }[] }) {
  return (
    <>
      <div className="grade g2" style={{ gap: 12 }}>
        <div>
          <label className="rotulo">Categoria</label>
          <select name="categoria" defaultValue={s?.categoria}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
        </div>
        <div><label className="rotulo">Ordem</label><input type="number" name="ordem" defaultValue={s?.ordem ?? 1} /></div>
      </div>
      <label className="rotulo">Título</label><input type="text" name="titulo" required defaultValue={s?.titulo ?? ""} />
      <label className="rotulo">Quando usar</label><input type="text" name="quando" defaultValue={s?.quando ?? ""} />
      <label className="rotulo">Texto</label><textarea name="texto" required rows={6} defaultValue={s?.texto ?? ""} />
      <div className="ajuda">Variáveis preenchidas sozinhas: {"{loja}"}, {"{seu_nome}"}, {"{cidade}"}, {"{instagram}"}, {"{whatsapp}"}. Qualquer outra, como {"{cliente}"}, aparece para a loja completar.</div>
    </>
  );
}

function CamposAula({ a }: { a?: Aula }) {
  return (
    <>
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Módulo</label><input type="text" name="modulo" required defaultValue={a?.modulo ?? ""} /></div>
        <div><label className="rotulo">Ordem</label><input type="number" name="ordem" defaultValue={a?.ordem ?? 1} /></div>
      </div>
      <label className="rotulo">Título</label><input type="text" name="titulo" required defaultValue={a?.titulo ?? ""} />
      <label className="rotulo">Link do vídeo (YouTube não listado, Vimeo ou área de membros)</label><input type="url" name="video_url" defaultValue={a?.video_url ?? ""} />
      <label className="rotulo">Descrição</label><textarea name="descricao" defaultValue={a?.descricao ?? ""} />
    </>
  );
}

export default async function Biblioteca() {
  await contextoEquipe();
  const supabase = await supabaseServer();
  const [{ data: cats }, { data: scripts }, { data: aulas }, { data: passos }, { data: modelo }] = await Promise.all([
    supabase.from("script_categorias").select("id, titulo").order("ordem"),
    supabase.from("scripts").select("*").order("ordem"),
    supabase.from("aulas").select("*").order("ordem"),
    supabase.from("jornada_passos").select("*").order("numero"),
    supabase.from("plano_modelo").select("*").order("mes").order("ordem"),
  ]);
  const categorias = cats ?? [];

  return (
    <>
      <Titulo titulo="Biblioteca" sub="O que a equipe edita uma vez e aparece para todos os portais." />

      <div className="secao">Scripts de venda</div>
      <div className="card mb">
        <details><summary className="btn p peq" style={{ display: "inline-flex" }}>+ Novo script</summary>
          <form action={scriptSalvar.bind(null, null)} className="mt"><CamposScript categorias={categorias} /><div className="linha mt"><button className="btn p peq" type="submit">Criar script</button></div></form>
        </details>
        {categorias.map((c) => (
          <div key={c.id} className="mt">
            <h3>{c.titulo}</h3>
            {(scripts ?? []).filter((s) => s.categoria === c.id).map((s) => (
              <details key={s.id} className="marcar" style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>{s.titulo}</summary>
                <form action={scriptSalvar.bind(null, s.id)} className="mt"><CamposScript s={s} categorias={categorias} /><div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div></form>
                <form action={scriptApagar.bind(null, s.id)} className="mt"><button className="btn s peq" type="submit">Apagar script</button></form>
              </details>
            ))}
          </div>
        ))}
      </div>

      <div className="secao">Cursos e aulas</div>
      <div className="card mb">
        <details><summary className="btn p peq" style={{ display: "inline-flex" }}>+ Nova aula</summary>
          <form action={aulaSalvar.bind(null, null)} className="mt"><CamposAula /><div className="linha mt"><button className="btn p peq" type="submit">Criar aula</button></div></form>
        </details>
        {(aulas ?? []).map((a) => (
          <details key={a.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}>{a.modulo} · <b>{a.titulo}</b>{a.video_url ? " · ▶" : " · sem vídeo"}</summary>
            <form action={aulaSalvar.bind(null, a.id)} className="mt"><CamposAula a={a} /><div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div></form>
            <form action={aulaApagar.bind(null, a.id)} className="mt"><button className="btn s peq" type="submit">Apagar aula</button></form>
          </details>
        ))}
      </div>

      <div className="secao">Modelo do Plano de Ação</div>
      <div className="card mb">
        <p className="mudo">Todo portal novo começa com estas tarefas. Depois a equipe ajusta no portal de cada loja.</p>
        <div className="grade g3">
          {[1, 2, 3].map((m) => (
            <div key={m}>
              <h3>{MESES_PLANO[m]}</h3>
              {(modelo ?? []).filter((i) => i.mes === m).map((i) => (
                <div key={i.id} className="linha entre marcar" style={{ cursor: "default", flexWrap: "nowrap" }}>
                  <span>{i.texto}</span>
                  <form action={modeloApagar.bind(null, i.id)}><button className="btn s peq" type="submit" aria-label="Apagar">✕</button></form>
                </div>
              ))}
              <form action={modeloAdicionar} className="linha mt" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="mes" value={m} />
                <input type="text" name="texto" placeholder="Nova tarefa…" />
                <button className="btn p peq" type="submit">+</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="secao">Os 7 passos da jornada</div>
      <div className="card">
        {(passos ?? []).map((p) => (
          <details key={p.numero} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}>{p.numero}. <b>{p.titulo}</b></summary>
            <form action={passoSalvar.bind(null, p.numero)} className="mt">
              <label className="rotulo">Título</label><input type="text" name="titulo" defaultValue={p.titulo} />
              <label className="rotulo">Descrição curta</label><input type="text" name="descricao" defaultValue={p.descricao} />
              <label className="rotulo">Conteúdo da página</label><textarea name="conteudo" rows={14} defaultValue={p.conteudo} />
              <div className="ajuda">Use ## para títulos, **texto** para negrito e linhas começando com - para listas.</div>
              <div className="linha mt"><button className="btn p peq" type="submit">Salvar passo</button></div>
            </form>
          </details>
        ))}
      </div>
    </>
  );
}
