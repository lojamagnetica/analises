"use client";

import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MESES_PLANO } from "@/lib/conteudo";
import { modeloAdicionar, modeloApagar, passoSalvar, scriptApagar, scriptSalvar } from "@/lib/acoes";
import { aulaVideo, ferramentaLink, nomeAula, type Aula, type Ferramenta, type Modulo } from "@/lib/curso";


type Script = { id: string; categoria: string; titulo: string; quando: string; texto: string; ordem: number };

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

export default function Biblioteca() {
  useEquipe();
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: cats }, { data: scripts }, { data: modulos }, { data: aulas }, { data: ferramentas }, { data: passos }, { data: modelo }] = await Promise.all([
      sb.from("script_categorias").select("id, titulo").order("ordem"),
      sb.from("scripts").select("*").order("ordem"),
      sb.from("curso_modulos").select("*").order("ordem"),
      sb.from("curso_aulas").select("*").order("ordem"),
      sb.from("curso_ferramentas").select("*").order("ordem"),
      sb.from("jornada_passos").select("*").order("numero"),
      sb.from("plano_modelo").select("*").order("mes").order("ordem"),
    ]);
    return { cats, scripts, modulos: (modulos ?? []) as Modulo[], aulas: (aulas ?? []) as Aula[], ferramentas: (ferramentas ?? []) as Ferramenta[], passos, modelo };
  }, []);
  if (!dados) return <Carregando />;
  const { cats, scripts, modulos, aulas, ferramentas, passos, modelo } = dados;
  const ferramentasProntas = ferramentas.filter((f) => f.url || f.formato === "No Hub").length;
  const categorias = cats ?? [];

  return (
    <>
      <Titulo titulo="Biblioteca" sub="O que a equipe edita uma vez e aparece para todos os portais." />

      <div className="secao">Scripts de venda</div>
      <div className="card mb">
        <details><summary className="btn p peq" style={{ display: "inline-flex" }}>+ Novo script</summary>
          <form action={async (f) => { await scriptSalvar(null, f); recarregar(); }} className="mt"><CamposScript categorias={categorias} /><div className="linha mt"><button className="btn p peq" type="submit">Criar script</button></div></form>
        </details>
        {categorias.map((c) => (
          <div key={c.id} className="mt">
            <h3>{c.titulo}</h3>
            {(scripts ?? []).filter((s) => s.categoria === c.id).map((s) => (
              <details key={s.id} className="marcar" style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>{s.titulo}</summary>
                <form action={async (f) => { await scriptSalvar(s.id, f); recarregar(); }} className="mt"><CamposScript s={s} categorias={categorias} /><div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div></form>
                <form action={async () => { await scriptApagar(s.id); recarregar(); }} className="mt"><button className="btn s peq" type="submit">Apagar script</button></form>
              </details>
            ))}
          </div>
        ))}
      </div>

      <div className="secao">Curso Loja Magnética</div>
      <div className="card mb">
        <p className="mudo" style={{ marginTop: 0 }}>
          A estrutura vem do Mapa do Curso. Aqui a equipe cola o link de cada vídeo e de cada material quando ficar pronto.
          {" "}<b>{aulas.filter((a) => a.video_url).length}/{aulas.length} aulas gravadas</b> · <b>{ferramentasProntas}/{ferramentas.length} ferramentas prontas</b>.
        </p>
        {modulos.map((m) => (
          <details key={m.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}><b>{m.titulo}</b> · {aulas.filter((a) => a.modulo_id === m.id && a.video_url).length}/{aulas.filter((a) => a.modulo_id === m.id).length} vídeos</summary>
            <h3 className="mt">Aulas</h3>
            {aulas.filter((a) => a.modulo_id === m.id).map((a) => (
              <form key={a.id} className="linha mt" style={{ flexWrap: "nowrap" }} action={async (f) => { await aulaVideo(a.id, f); recarregar(); }}>
                <span style={{ minWidth: 220 }}>{a.fundamento ? `${a.fundamento} · ` : ""}{nomeAula(a)}</span>
                <input type="url" name="video_url" defaultValue={a.video_url ?? ""} placeholder="Link do vídeo (YouTube não listado ou Vimeo)" />
                <button className="btn p peq" type="submit">Salvar</button>
              </form>
            ))}
            <h3 className="mt">Ferramentas</h3>
            {ferramentas.filter((f) => f.modulo_id === m.id && f.formato !== "No Hub").map((f) => (
              <form key={f.id} className="linha mt" style={{ flexWrap: "nowrap" }} action={async (fd) => { await ferramentaLink(f.id, fd); recarregar(); }}>
                <span style={{ minWidth: 220 }}><span className="selo espera" style={{ marginRight: 6 }}>{f.formato}</span>{f.fundamento ? `${f.fundamento} · ` : ""}{f.nome}</span>
                <input type="url" name="url" defaultValue={f.url ?? ""} placeholder="Link da planilha, PDF ou documento" />
                <button className="btn p peq" type="submit">Salvar</button>
              </form>
            ))}
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
                  <form action={async () => { await modeloApagar(i.id); recarregar(); }}><button className="btn s peq" type="submit" aria-label="Apagar">✕</button></form>
                </div>
              ))}
              <form action={async (f) => { await modeloAdicionar(f); recarregar(); }} className="linha mt" style={{ flexWrap: "nowrap" }}>
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
            <form action={async (f) => { await passoSalvar(p.numero, f); recarregar(); }} className="mt">
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
