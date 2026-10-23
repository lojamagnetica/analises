"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CamposPortal } from "@/components/CamposPortal";
import { FichaLoja } from "@/components/FichaLoja";
import { LinkAcesso } from "@/components/LinkAcesso";
import { Titulo } from "@/components/Titulo";
import { CHAVE_RESULTADO, Carregando, useDados, useEquipe, type Portal } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ETAPAS, MESES_PLANO, type Respostas } from "@/lib/conteudo";
import { dataHora, haQuanto, isoParaLocal } from "@/lib/formato";
import {
  atualizarPortal, convidarPessoa, desligarPessoa, gerarLink, planoAdicionar, planoApagar, reuniaoApagar, reuniaoSalvar,
} from "@/lib/acoes";


type Reuniao = { id: string; titulo: string; data: string; selecionar: string; status: string; gravacao_url: string | null; ata: string | null };

function CamposReuniao({ r }: { r?: Reuniao }) {
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

function EditarPortal() {
  const id = useSearchParams().get("id") ?? "";
  const hub = useEquipe();
  const [aviso, setAviso] = useState<{ ok?: string; erro?: string; link?: string }>({});
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    try {
      const r = JSON.parse(sessionStorage.getItem(CHAVE_RESULTADO) ?? "null");
      if (r) {
        sessionStorage.removeItem(CHAVE_RESULTADO);
        setAviso({ ok: r.criado ? "Portal criado." : undefined, link: r.link, erro: r.aviso });
      }
    } catch { /* sem armazenamento */ }
  }, []);

  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: portal }, { data: pessoas }, { data: plano }, { data: reunioes }, { data: pers }] = await Promise.all([
      sb.from("portais").select("*").eq("id", id).maybeSingle(),
      sb.from("perfis").select("id, nome, email, ultimo_acesso").eq("portal_id", id),
      sb.from("plano_itens").select("id, mes, texto, feito").eq("portal_id", id).order("mes").order("ordem"),
      sb.from("reunioes").select("*").eq("portal_id", id).order("data", { ascending: false }),
      sb.from("personalizacao").select("etapa, respostas, concluida").eq("portal_id", id),
    ]);
    return { portal: portal as Portal | null, pessoas: pessoas ?? [], plano: plano ?? [], reunioes: (reunioes ?? []) as Reuniao[], pers: pers ?? [] };
  }, [id]);
  if (!dados) return <Carregando />;
  const p = dados.portal;
  if (!p) return <div className="card">Portal não encontrado.</div>;

  const acesso = async (fazer: () => Promise<{ link?: string; aviso?: string }>) => {
    const r = await fazer();
    setAviso({ link: r.link, erro: r.aviso });
    recarregar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Titulo voltar={{ href: "/empresa/carteira", rotulo: "Carteira" }} titulo={p.loja} sub={`${p.tipo} · passo ${p.passo_atual} de 7`} />
      {aviso.ok && <div className="aviso ok mb">{aviso.ok}</div>}
      {aviso.link && <LinkAcesso link={aviso.link} nome={p.responsavel ?? ""} whatsapp={p.whatsapp} />}
      {aviso.erro && <div className="aviso mb">{aviso.erro}</div>}
      <div className="mb"><button className="btn p" type="button" onClick={() => hub.abrirPortal(p.id)}>Abrir o portal da loja</button></div>

      <div className="grade g2">
        <form className="card" action={async (f) => { await atualizarPortal(p.id, f); setSalvo(true); recarregar(); }}>
          <h2>Dados do portal</h2>
          <CamposPortal p={p} />
          <div className="grade g2" style={{ gap: 12 }}>
            <div>
              <label className="rotulo">Passo atual da jornada</label>
              <select name="passo_atual" defaultValue={p.passo_atual}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <label className="marcar" style={{ alignSelf: "end" }}><input type="checkbox" name="ativo" defaultChecked={p.ativo} /><span>Portal ativo</span></label>
          </div>
          {salvo && <div className="aviso ok mt">Dados salvos.</div>}
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>

        <div className="card">
          <h2>Quem acessa</h2>
          {dados.pessoas.length === 0 && <p className="mudo">Ninguém ainda. Crie o acesso abaixo.</p>}
          {dados.pessoas.map((u) => (
            <div key={u.id} className="linha entre marcar" style={{ cursor: "default" }}>
              <div><b>{u.nome}</b><div className="mudo" style={{ fontSize: 13 }}>{u.email} · último acesso {haQuanto(u.ultimo_acesso)}</div></div>
              <div className="linha" style={{ flexWrap: "nowrap" }}>
                <button className="btn s peq" type="button" onClick={() => acesso(async () => {
                  try { return { link: await gerarLink(u.email ?? "", u.nome ?? "") }; } catch (e) { return { aviso: (e as Error).message }; }
                })}>Novo link</button>
                <button className="btn s peq" type="button" onClick={async () => { await desligarPessoa(p.id, u.id); recarregar(); }}>Remover</button>
              </div>
            </div>
          ))}
          <form action={(f) => acesso(() => convidarPessoa(p.id, f))} className="mt">
            <div className="grade g2" style={{ gap: 12 }}>
              <div><label className="rotulo">Nome</label><input type="text" name="nome" /></div>
              <div><label className="rotulo">E-mail</label><input type="email" name="email" required /></div>
            </div>
            <div className="linha mt"><button className="btn p peq" type="submit">Criar acesso</button></div>
          </form>

          <h2 className="mt">Personalização</h2>
          {ETAPAS.map((e) => {
            const linha = dados.pers.find((x) => x.etapa === e.numero);
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

      <FichaLoja portalId={p.id} />

      <div className="card mt">
        <h2>Plano de Ação</h2>
        <div className="grade g3">
          {[1, 2, 3].map((m) => (
            <div key={m}>
              <h3>{MESES_PLANO[m]}</h3>
              {dados.plano.filter((i) => i.mes === m).map((i) => (
                <div key={i.id} className="linha entre marcar" style={{ cursor: "default", flexWrap: "nowrap" }}>
                  <span style={{ textDecoration: i.feito ? "line-through" : undefined }}>{i.feito ? "✓ " : ""}{i.texto}</span>
                  <button className="btn s peq" type="button" aria-label="Apagar" onClick={async () => { await planoApagar(i.id); recarregar(); }}>✕</button>
                </div>
              ))}
              <form action={async (f) => { await planoAdicionar(p.id, f); recarregar(); }} className="linha mt" style={{ flexWrap: "nowrap" }}>
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
          <form action={async (f) => { await reuniaoSalvar(p.id, null, f); recarregar(); }} className="mt">
            <CamposReuniao />
            <div className="linha mt"><button className="btn p peq" type="submit">Criar</button></div>
          </form>
        </details>
        {dados.reunioes.map((r) => (
          <details key={r.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer", textTransform: "capitalize" }}>{dataHora(r.data)} · <b>{r.titulo}</b> · {r.selecionar}{r.gravacao_url ? " · ▶" : ""}</summary>
            <form action={async (f) => { await reuniaoSalvar(p.id, r.id, f); recarregar(); }} className="mt">
              <CamposReuniao r={r} />
              <div className="linha mt"><button className="btn p peq" type="submit">Salvar</button></div>
            </form>
            <button className="btn s peq mt" type="button" onClick={async () => { await reuniaoApagar(r.id); recarregar(); }}>Apagar reunião</button>
          </details>
        ))}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><EditarPortal /></Suspense>;
}
