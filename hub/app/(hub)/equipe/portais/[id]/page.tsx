import { notFound } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { contextoEquipe, type Portal } from "@/lib/contexto";
import { supabaseServer } from "@/lib/supabase/server";
import { ETAPAS, MESES_PLANO, type Respostas } from "@/lib/conteudo";
import { dataHora, haQuanto, isoParaLocal } from "@/lib/formato";
import { abrirPortal } from "../../../acoes";
import {
  atualizarPortal, convidarPessoa, desligarPessoa, planoAdicionar, planoApagar, reuniaoApagar, reuniaoSalvar,
} from "../../acoes";
import { CamposPortal } from "../CamposPortal";

function CamposReuniao({ r }: { r?: { titulo: string; data: string; selecionar: string; status: string; gravacao_url: string | null; ata: string | null } }) {
  return (
    <>
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Tema</label><input type="text" name="titulo" defaultValue={r?.titulo ?? ""} /></div>
        <div><label className="rotulo">Data e hora (Recife)</label><input type="datetime-local" name="data" required={!r} defaultValue={r ? isoParaLocal(r.data) : ""} /></div>
        <div>
          <label className="rotulo">Selecionar</label>
          <select name="selecionar" defaultValue={r?.selecionar ?? "Pendente"}><option>Pendente</option><option>Adiado</option><option>Realizado</option></select>
        </div>
        <div>
          <label className="rotulo">Status</label>
          <select name="status" defaultValue={r?.status ?? "Não iniciada"}><option>Não iniciada</option><option>Em andamento</option><option>Concluído</option></select>
        </div>
      </div>
      <label className="rotulo">Link da gravação</label>
      <input type="url" name="gravacao_url" defaultValue={r?.gravacao_url ?? ""} />
      <label className="rotulo">Ata / combinados</label>
      <textarea name="ata" defaultValue={r?.ata ?? ""} />
    </>
  );
}

export default async function EditarPortal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string; criado?: string; convidado?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await contextoEquipe();
  const supabase = await supabaseServer();
  const [{ data: portal }, { data: pessoas }, { data: plano }, { data: reunioes }, { data: pers }] = await Promise.all([
    supabase.from("portais").select("*").eq("id", id).maybeSingle(),
    supabase.from("perfis").select("id, nome, email, ultimo_acesso").eq("portal_id", id),
    supabase.from("plano_itens").select("id, mes, texto, feito").eq("portal_id", id).order("mes").order("ordem"),
    supabase.from("reunioes").select("*").eq("portal_id", id).order("data", { ascending: false }),
    supabase.from("personalizacao").select("etapa, respostas, concluida").eq("portal_id", id),
  ]);
  if (!portal) notFound();
  const p = portal as Portal;

  return (
    <>
      <Titulo voltar={{ href: "/equipe", rotulo: "Painel" }} titulo={p.loja} sub={`${p.tipo} · passo ${p.passo_atual} de 7`} />
      {sp.criado && <div className="aviso ok mb">Portal criado.</div>}
      {sp.convidado && <div className="aviso ok mb">Convite enviado.</div>}
      {sp.aviso && <div className="aviso mb">{sp.aviso}</div>}
      <form action={abrirPortal.bind(null, p.id)} className="mb"><button className="btn p" type="submit">Abrir portal como mentorado(a) vê</button></form>

      <div className="grade g2">
        <form className="card" action={atualizarPortal.bind(null, p.id)}>
          <h2>Dados do portal</h2>
          <CamposPortal p={p} />
          <div className="grade g2" style={{ gap: 12 }}>
            <div>
              <label className="rotulo">Passo atual da jornada</label>
              <select name="passo_atual" defaultValue={p.passo_atual}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <label className="marcar" style={{ alignSelf: "end" }}><input type="checkbox" name="ativo" defaultChecked={p.ativo} /><span>Portal ativo</span></label>
          </div>
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>

        <div className="card">
          <h2>Quem acessa</h2>
          {(pessoas ?? []).length === 0 && <p className="mudo">Ninguém ainda. Convide abaixo.</p>}
          {(pessoas ?? []).map((u) => (
            <div key={u.id} className="linha entre marcar" style={{ cursor: "default" }}>
              <div><b>{u.nome}</b><div className="mudo" style={{ fontSize: 13 }}>{u.email} · último acesso {haQuanto(u.ultimo_acesso)}</div></div>
              <form action={desligarPessoa.bind(null, p.id, u.id)}><button className="btn s peq" type="submit">Remover</button></form>
            </div>
          ))}
          <form action={convidarPessoa.bind(null, p.id)} className="mt">
            <div className="grade g2" style={{ gap: 12 }}>
              <div><label className="rotulo">Nome</label><input type="text" name="nome" /></div>
              <div><label className="rotulo">E-mail</label><input type="email" name="email" required /></div>
            </div>
            <div className="linha mt"><button className="btn p peq" type="submit">Convidar</button></div>
          </form>

          <h2 className="mt">Personalização</h2>
          {ETAPAS.map((e) => {
            const linha = (pers ?? []).find((x) => x.etapa === e.numero);
            const r = (linha?.respostas ?? {}) as Respostas;
            return (
              <details key={e.numero} className="marcar" style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>
                  <span className={`selo ${linha?.concluida ? "feito" : "espera"}`} style={{ marginRight: 8 }}>{linha?.concluida ? "feito" : "pendente"}</span>
                  {e.numero}. {e.titulo}
                </summary>
                <div style={{ fontSize: 13.5, marginTop: 8 }}>
                  {e.campos.map((c) => {
                    const v = r[c.id];
                    const t = Array.isArray(v) ? v.join(", ") : v;
                    return t ? <p key={c.id} style={{ margin: "0 0 6px" }}><b>{c.rotulo}:</b> {t}</p> : null;
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="card mt">
        <h2>Plano de Ação</h2>
        <div className="grade g3">
          {[1, 2, 3].map((m) => (
            <div key={m}>
              <h3>{MESES_PLANO[m]}</h3>
              {(plano ?? []).filter((i) => i.mes === m).map((i) => (
                <div key={i.id} className="linha entre marcar" style={{ cursor: "default", flexWrap: "nowrap" }}>
                  <span style={{ textDecoration: i.feito ? "line-through" : undefined }}>{i.feito ? "✓ " : ""}{i.texto}</span>
                  <form action={planoApagar.bind(null, p.id, i.id)}><button className="btn s peq" type="submit" aria-label="Apagar">✕</button></form>
                </div>
              ))}
              <form action={planoAdicionar.bind(null, p.id)} className="linha mt" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="mes" value={m} />
                <input type="text" name="texto" placeholder="Nova tarefa…" />
                <button className="btn p peq" type="submit">+</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt" id="reunioes">
        <h2>Reuniões</h2>
        <details className="mb">
          <summary className="btn s peq" style={{ display: "inline-flex" }}>+ Nova reunião</summary>
          <form action={reuniaoSalvar.bind(null, p.id, null)} className="mt"><CamposReuniao /><div className="linha mt"><button className="btn p peq" type="submit">Criar</button></div></form>
        </details>
        {(reunioes ?? []).map((r) => (
          <details key={r.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer", textTransform: "capitalize" }}>{dataHora(r.data)} · <b>{r.titulo}</b> · {r.selecionar}{r.gravacao_url ? " · ▶" : ""}</summary>
            <form action={reuniaoSalvar.bind(null, p.id, r.id)} className="mt"><CamposReuniao r={r} />
              <div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div>
            </form>
            <form action={reuniaoApagar.bind(null, p.id, r.id)} className="mt"><button className="btn s peq" type="submit">Apagar reunião</button></form>
          </details>
        ))}
      </div>
    </>
  );
}
