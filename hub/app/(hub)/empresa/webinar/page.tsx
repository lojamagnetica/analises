"use client";

import { useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados } from "@/lib/hub";
import { dataHora } from "@/lib/formato";
import {
  apelidoDe, buscarConfig, buscarCriativos, buscarLeads, buscarParceiros, contarCliques, excluirCriativo, excluirLead, excluirParceiro,
  importarLeads, lerLeads, linkCriativo, linkParceiro, mudarOrigem, renomearCriativo, salvarConfig, salvarCriativoLink, salvarParceiro,
  subirCriativo, type Config, type Lead, type Parceiro,
} from "@/lib/webinar";

type Aba = "funis" | "leads" | "criativos";

function Funis({ cfg, parceiros, cliques, leads, recarregar, setMsg }: { cfg: Config; parceiros: Parceiro[]; cliques: Map<string, number>; leads: Lead[]; recarregar: () => void; setMsg: (s: string) => void }) {
  const [form, setForm] = useState<string | null>(null);
  const [novo, setNovo] = useState({ nome: "", apelido: "", contato: "" });
  const [ed, setEd] = useState<Parceiro | null>(null);
  const fazer = async (f: () => Promise<void>, aviso: string) => { setMsg(""); try { await f(); setMsg(aviso); recarregar(); } catch (e) { setMsg((e as Error).message.includes("duplicate") ? "Já existe um parceiro com esse apelido." : (e as Error).message); } };
  const leadsDe = (a: string) => leads.filter((l) => l.origem === a).length;
  const linhas = [...parceiros.map((p) => ({ p, apelido: p.apelido, nome: p.nome })), { p: null, apelido: "direto", nome: "Direto (sem parceiro)" }];
  const melhor = [...linhas].filter((l) => l.p).sort((a, b) => leadsDe(b.apelido) - leadsDe(a.apelido))[0];

  return (
    <>
      <div className="card mb">
        <b>Formulário de inscrição (Respondi)</b>
        <p className="ajuda" style={{ margin: "2px 0 6px" }}>Cole o link do formulário. Todos os links de parceiro levam para ele, cada um com a sua origem marcada.</p>
        <div className="linha" style={{ gap: 6 }}>
          <input type="url" value={form ?? cfg.formulario} placeholder="https://form.respondi.app/..." onChange={(e) => setForm(e.target.value)} />
          {form !== null && <button type="button" className="btn p peq" disabled={!/^https:\/\//.test(form)} onClick={() => fazer(async () => { await salvarConfig({ ...cfg, formulario: form.trim() }); setForm(null); }, "Formulário salvo ✓")}>Salvar</button>}
        </div>
        {!cfg.formulario && <p className="aviso mt" style={{ marginBottom: 0 }}>Sem o formulário, os links ainda não levam a lugar nenhum.</p>}
      </div>

      <div className="secao">Links por parceiro</div>
      <div className="card mb" style={{ overflowX: "auto" }}>
        <table className="tabela">
          <thead><tr><th>Parceiro</th><th>Link</th><th>Cliques</th><th>Leads</th><th>Viraram lead</th><th></th></tr></thead>
          <tbody>
            {linhas.map(({ p, apelido, nome }) => {
              const c = cliques.get(apelido) ?? 0, l = leadsDe(apelido);
              return (
                <tr key={apelido}>
                  <td><b>{nome}</b>{p?.contato && <><br /><small className="mudo">{p.contato}</small></>}{p && !p.ativo && <><br /><small className="selo espera">pausado</small></>}</td>
                  <td><Copiar texto={apelido === "direto" ? linkParceiro("") : linkParceiro(apelido)} rotulo="Copiar link" /></td>
                  <td>{c}</td><td><b>{l}</b></td><td>{c ? `${Math.round((l / c) * 100)}%` : "—"}</td>
                  <td>{p && (
                    <span className="linha" style={{ gap: 8 }}>
                      <button type="button" className="link-loja" onClick={() => setEd(p)}>Editar</button>
                      <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Excluir o parceiro ${p.nome}? O link dele para de contar.`)) fazer(() => excluirParceiro(p.id), "Parceiro excluído."); }}>Excluir</button>
                    </span>
                  )}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {melhor && leadsDe(melhor.apelido) > 0 && <p style={{ marginBottom: 0 }}>Quem mais trouxe leads até agora: <b>{melhor.nome}</b> ({leadsDe(melhor.apelido)}).</p>}
        <p className="ajuda" style={{ marginBottom: 0 }}>Cliques contam quem abriu o link. Leads contam quem se inscreveu (entram pela importação do Respondi, na aba Leads).</p>
      </div>

      <div className="card">
        <b>{ed ? `Editar ${ed.nome}` : "Novo parceiro"}</b>
        {(() => {
          const v = ed ?? { ...novo, id: "", obs: "", ativo: true, created_at: "" };
          const muda = (x: Partial<Parceiro>) => (ed ? setEd({ ...ed, ...x }) : setNovo({ ...novo, ...x } as typeof novo));
          return (
            <div className="grade g3 mt" style={{ gap: 8 }}>
              <label className="ajuda">Nome<input type="text" value={v.nome} onChange={(e) => muda({ nome: e.target.value, ...(ed ? {} : { apelido: apelidoDe(e.target.value) }) })} /></label>
              <label className="ajuda">Apelido no link<input type="text" value={v.apelido} onChange={(e) => muda({ apelido: apelidoDe(e.target.value) })} /></label>
              <label className="ajuda">Contato<input type="text" value={v.contato} placeholder="WhatsApp ou @" onChange={(e) => muda({ contato: e.target.value })} /></label>
            </div>
          );
        })()}
        <div className="linha mt" style={{ gap: 8 }}>
          {ed ? (
            <>
              <button type="button" className="btn p peq" disabled={!ed.nome.trim() || ed.apelido.length < 2} onClick={() => fazer(async () => { await salvarParceiro(ed); setEd(null); }, "Parceiro salvo ✓")}>Salvar</button>
              <button type="button" className="btn s peq" onClick={() => fazer(async () => { await salvarParceiro({ ...ed, ativo: !ed.ativo }); setEd(null); }, ed.ativo ? "Link pausado." : "Link ativado ✓")}>{ed.ativo ? "Pausar o link" : "Ativar o link"}</button>
              <button type="button" className="btn s peq" onClick={() => setEd(null)}>Cancelar</button>
            </>
          ) : (
            <button type="button" className="btn p peq" disabled={!novo.nome.trim() || novo.apelido.length < 2} onClick={() => fazer(async () => { await salvarParceiro(novo); setNovo({ nome: "", apelido: "", contato: "" }); }, "Parceiro criado ✓ Copie o link dele na tabela.")}>Criar o link</button>
          )}
        </div>
        {ed && ed.apelido !== parceiros.find((p) => p.id === ed.id)?.apelido && <p className="aviso mt" style={{ marginBottom: 0 }}>Mudar o apelido muda o link: o link antigo para de contar para este parceiro.</p>}
      </div>
    </>
  );
}

function Leads({ parceiros, leads, recarregar, setMsg }: { parceiros: Parceiro[]; leads: Lead[]; recarregar: () => void; setMsg: (s: string) => void }) {
  const [filtro, setFiltro] = useState("todos");
  const [padrao, setPadrao] = useState("direto");
  const [lendo, setLendo] = useState(false);
  const nomes = new Map(parceiros.map((p) => [p.apelido, p.nome]));
  const nomeDe = (a: string) => (a === "direto" ? "Direto" : nomes.get(a) ?? a);
  const origens = [...new Set(["direto", ...parceiros.map((p) => p.apelido), ...leads.map((l) => l.origem)])];
  const lista = leads.filter((l) => filtro === "todos" || l.origem === filtro);
  return (
    <>
      <div className="card mb">
        <b>Trazer os leads do Respondi</b>
        <p className="ajuda" style={{ margin: "2px 0 6px" }}>No Respondi: abra o formulário, clique em <b>Respostas</b> e depois em <b>Exportar</b>. Escolha o arquivo aqui. A origem de cada lead vem da coluna <b>utm_source</b>. Se o arquivo não tiver essa coluna, escolha a origem do arquivo todo. Importar de novo não duplica.</p>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <label className="ajuda">Origem, se o arquivo não tiver utm_source
            <select value={padrao} onChange={(e) => setPadrao(e.target.value)}>{origens.map((o) => <option key={o} value={o}>{nomeDe(o)}</option>)}</select>
          </label>
          <label className="btn p peq" style={{ cursor: "pointer" }}>{lendo ? "Importando…" : "Escolher o arquivo"}
            <input type="file" hidden accept=".csv,text/csv" disabled={lendo} onChange={async (ev) => {
              const f = ev.target.files?.[0]; ev.target.value = ""; if (!f) return;
              setLendo(true); setMsg("");
              try {
                const { leads: novos, temOrigem } = await lerLeads(f, padrao);
                await importarLeads(novos);
                setMsg(`${novos.length} leads importados ✓${temOrigem ? " A origem veio da coluna utm_source." : ` Sem a coluna utm_source: todos ficaram como ${nomeDe(padrao)}.`}`);
                recarregar();
              } catch (e) { setMsg((e as Error).message); }
              setLendo(false);
            }} />
          </label>
        </div>
      </div>

      <div className="chips mb" role="group" aria-label="Filtrar por origem">
        <button type="button" className={`chip ${filtro === "todos" ? "escolhido" : ""}`} onClick={() => setFiltro("todos")}>Todos ({leads.length})</button>
        {origens.map((o) => <button key={o} type="button" className={`chip ${filtro === o ? "escolhido" : ""}`} onClick={() => setFiltro(o)}>{nomeDe(o)} ({leads.filter((l) => l.origem === o).length})</button>)}
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        {lista.length === 0 ? <p className="mudo" style={{ margin: 0 }}>Nenhum lead ainda.</p> : (
          <table className="tabela">
            <thead><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Origem</th><th>Quando</th><th></th></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.nome ?? "—"}</b>{l.instagram && <><br /><small className="mudo">{l.instagram}</small></>}</td>
                  <td>{l.whatsapp ?? "—"}</td><td>{l.email ?? "—"}</td>
                  <td><select value={l.origem} onChange={async (e) => { await mudarOrigem(l.id, e.target.value); recarregar(); }}>{[...new Set([...origens, l.origem])].map((o) => <option key={o} value={o}>{nomeDe(o)}</option>)}</select></td>
                  <td><small>{l.respondido_em ? dataHora(l.respondido_em) : "—"}</small></td>
                  <td><button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm("Excluir este lead?")) { await excluirLead(l.id); recarregar(); } }}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Criativos({ setMsg }: { setMsg: (s: string) => void }) {
  const { dados, recarregar } = useDados(buscarCriativos, []);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [subindo, setSubindo] = useState(0);
  if (!dados) return <Carregando />;
  const abrir = async (c: Parameters<typeof linkCriativo>[0], baixar = false) => { const u = await linkCriativo(c, baixar); if (u) window.open(u, "_blank"); };
  return (
    <>
      <div className="card mb">
        <b>Subir criativos</b>
        <p className="ajuda" style={{ margin: "2px 0 6px" }}>Artes, vídeos e textos para os parceiros postarem. Até 100 MB por arquivo. Também dá para guardar um link do Canva ou do Drive.</p>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="text" value={titulo} placeholder="Nome (opcional), ex.: Story 1 · convite" onChange={(e) => setTitulo(e.target.value)} style={{ maxWidth: 280 }} />
          <label className="btn p peq" style={{ cursor: "pointer" }}>{subindo ? `Subindo… faltam ${subindo}` : "+ Subir arquivos"}
            <input type="file" multiple hidden disabled={subindo > 0} accept="image/*,video/*,application/pdf,.txt,.docx" onChange={async (ev) => {
              const fs = Array.from(ev.target.files ?? []); ev.target.value = ""; setSubindo(fs.length); setMsg("");
              for (const f of fs) { try { await subirCriativo(f, fs.length === 1 ? titulo : ""); } catch (e) { setMsg((e as Error).message); } setSubindo((n) => n - 1); }
              setTitulo(""); recarregar();
            }} />
          </label>
        </div>
        <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="url" value={link} placeholder="Link do Canva ou do Drive" onChange={(e) => setLink(e.target.value)} style={{ maxWidth: 360 }} />
          <button type="button" className="btn s peq" disabled={!/^https?:\/\//.test(link)} onClick={async () => { try { await salvarCriativoLink(titulo || "Link", link.trim()); setLink(""); setTitulo(""); recarregar(); } catch (e) { setMsg((e as Error).message); } }}>Guardar o link</button>
        </div>
      </div>
      <div className="grade g3">
        {dados.map((c) => (
          <div key={c.id} className="card">
            <small className="mudo">{c.tipo === "image" ? "Imagem" : c.tipo === "video" ? "Vídeo" : c.tipo === "link" ? "Link" : "Arquivo"} · {dataHora(c.created_at)}</small>
            <div><b>{c.titulo}</b></div>
            {c.obs && <p className="ajuda" style={{ margin: "4px 0 0" }}>{c.obs}</p>}
            <div className="linha mt" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn s peq" onClick={() => abrir(c)}>Abrir</button>
              {c.arquivo && <button type="button" className="btn s peq" onClick={() => abrir(c, true)}>Baixar</button>}
              <button type="button" className="link-loja" onClick={async () => { const t = prompt("Nome do criativo:", c.titulo); if (t == null) return; const o = prompt("Observação (para quem, legenda...):", c.obs) ?? c.obs; await renomearCriativo(c.id, t.trim() || c.titulo, o); recarregar(); }}>Editar</button>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => { if (confirm(`Excluir "${c.titulo}"?`)) { await excluirCriativo(c); recarregar(); } }}>Excluir</button>
            </div>
          </div>
        ))}
        {dados.length === 0 && <p className="mudo">Nenhum criativo ainda.</p>}
      </div>
    </>
  );
}

export default function Webinar() {
  const [aba, setAba] = useState<Aba>("funis");
  const [msg, setMsg] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const [cfg, parceiros, cliques, leads] = await Promise.all([buscarConfig(), buscarParceiros(), contarCliques(), buscarLeads()]);
    return { cfg, parceiros, cliques, leads };
  }, []);
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Webinar" sub="Os criativos, os links de cada parceiro e os leads com a origem, para saber quem de fato traz resultado." />
      <div className="chips mb" role="tablist">
        {([["funis", "Funis e parceiros"], ["leads", `Leads (${dados.leads.length})`], ["criativos", "Criativos"]] as [Aba, string][]).map(([id, r]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={`chip ${aba === id ? "escolhido" : ""}`} onClick={() => { setAba(id); setMsg(""); }}>{r}</button>
        ))}
      </div>
      {msg && <div className={`aviso mb ${msg.includes("✓") ? "ok" : ""}`}>{msg}</div>}
      {aba === "funis" && <Funis cfg={dados.cfg} parceiros={dados.parceiros} cliques={dados.cliques} leads={dados.leads} recarregar={recarregar} setMsg={setMsg} />}
      {aba === "leads" && <Leads parceiros={dados.parceiros} leads={dados.leads} recarregar={recarregar} setMsg={setMsg} />}
      {aba === "criativos" && <Criativos setMsg={setMsg} />}
    </>
  );
}
