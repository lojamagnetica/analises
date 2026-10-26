"use client";

import { useEffect, useState } from "react";
import { BioPagina } from "@/components/BioPagina";
import { Copiar } from "@/components/Copiar";
import { Excluir } from "@/components/Excluir";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { variaveisDaLoja } from "@/lib/scripts";
import {
  FORMATOS, MODELOS, NOME_BLOCO, apagarBio, blocoNovo, buscarBio, fotoPequena, paginaInicial, rotuloDoBloco, salvarBio, slugDe,
  type Bloco, type PaginaBio, type TipoBloco,
} from "@/lib/bio";

const TIPOS: TipoBloco[] = ["whatsapp", "destaque", "acao", "local", "link", "texto", "faq"];

/** Os campos de cada tipo de bloco. */
function CamposBloco({ b, mudar }: { b: Bloco; mudar: (c: Partial<Bloco>) => void }) {
  const campo = (k: keyof Bloco, rotulo: string, opc: { area?: boolean; dica?: string } = {}) => (
    <div>
      <label className="rotulo" htmlFor={`${b.id}-${k}`}>{rotulo}</label>
      {opc.area
        ? <textarea id={`${b.id}-${k}`} rows={3} value={(b[k] as string) ?? ""} onChange={(e) => mudar({ [k]: e.target.value })} placeholder={opc.dica} />
        : <input id={`${b.id}-${k}`} type="text" value={(b[k] as string) ?? ""} onChange={(e) => mudar({ [k]: e.target.value })} placeholder={opc.dica} />}
    </div>
  );
  switch (b.tipo) {
    case "whatsapp": return <>{campo("titulo", "Texto do botão")}{campo("numero", "WhatsApp com DDD")}{campo("mensagem", "Mensagem que já chega escrita", { area: true })}</>;
    case "destaque": return <>{campo("titulo", "Texto do botão")}{campo("url", "Link", { dica: "https://…" })}</>;
    case "link": return <>{campo("titulo", "Texto do botão")}{campo("url", "Link", { dica: "https://…" })}</>;
    case "acao": return (
      <>
        <p className="ajuda" style={{ marginTop: 0 }}>Puxa sozinho a ação ativa de Vendas › Ações do Mês. Sem ação ativa, o bloco não aparece.</p>
        {campo("titulo", "Título do bloco (opcional)", { dica: "Ação do mês" })}{campo("numero", "WhatsApp com DDD")}
        {campo("mensagem", "Mensagem (opcional)", { area: true, dica: "Se ficar vazio: Oi! Vi a <ação> no Instagram e quero aproveitar." })}
      </>
    );
    case "local": return <>{campo("titulo", "Título")}{campo("endereco", "Endereço", { dica: "Rua, número, bairro, cidade" })}{campo("horario", "Horário", { area: true })}</>;
    case "texto": return campo("texto", "Texto", { area: true });
    case "faq": return <>{campo("pergunta", "Pergunta")}{campo("resposta", "Resposta", { area: true })}</>;
  }
}

export default function LinkDaBio() {
  const { portal, pers, foto, equipe } = usePortal();
  const { dados, recarregar } = useDados(() => buscarBio(portal.id), [portal.id]);
  const [p, setP] = useState<PaginaBio | null>(null);
  const [aba, setAba] = useState<"conteudo" | "aparencia">("conteudo");
  const [novoTipo, setNovoTipo] = useState<TipoBloco>("link");
  const [sujo, setSujo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!dados) return;
    const v = variaveisDaLoja(pers.get(2)?.respostas, portal.loja);
    setP(dados.pagina ?? paginaInicial(portal.id, { loja: v.loja, instagram: v.instagram, whatsapp: v.whatsapp || portal.whatsapp || "", cidade: v.cidade, foto: equipe ? null : foto }));
    setSujo(false);
  }, [dados]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dados || !p) return <Carregando />;

  const mudar = (n: Partial<PaginaBio>) => { setP({ ...p, ...n }); setSujo(true); setAviso(null); };
  const mudarBloco = (i: number, c: Partial<Bloco>) => mudar({ blocos: p.blocos.map((b, j) => (j === i ? { ...b, ...c } : b)) });
  const mover = (i: number, d: -1 | 1) => { const xs = [...p.blocos]; [xs[i], xs[i + d]] = [xs[i + d], xs[i]]; mudar({ blocos: xs }); };
  const endereco = typeof window === "undefined" ? "" : `${window.location.origin}${BASE}/bio/?l=${p.slug}`;
  const salvar = async (publicada = p.publicada) => {
    setSalvando(true); setAviso(null);
    try {
      const salvo = await salvarBio({ ...p, publicada });
      setP(salvo); setSujo(false);
      setAviso({ ok: true, texto: publicada ? (p.publicada ? "Alterações publicadas." : "Página publicada! Copie o link e cole na bio do Instagram.") : "Rascunho salvo. Só aparece para o público depois de publicar." });
      recarregar();
    } catch (e) { setAviso({ ok: false, texto: (e as Error).message }); }
    setSalvando(false);
  };

  return (
    <>
      <Titulo titulo="Link da Bio" sub="Uma página com o WhatsApp da loja, a ação do mês, como chegar e os seus links. Cole o link na bio do Instagram." />

      <div className="card mb linha entre">
        <div className="linha" style={{ gap: 8 }}>
          <span className={`selo ${p.publicada ? "feito" : "espera"}`}>{p.publicada ? "Publicada" : "Rascunho"}</span>
          {sujo && <span className="selo alerta">alterações não salvas</span>}
          {p.publicada && <small className="mudo" style={{ wordBreak: "break-all" }}>{endereco}</small>}
        </div>
        <div className="linha" style={{ gap: 6 }}>
          <button type="button" className="btn s peq" disabled={salvando} onClick={() => salvar()}>Salvar</button>
          <button type="button" className="btn p peq" disabled={salvando} onClick={() => salvar(true)}>{p.publicada ? "Publicar alterações" : "Publicar"}</button>
          {p.publicada && <Copiar texto={endereco} rotulo="Copiar link" />}
          {p.publicada && <a className="btn s peq" href={endereco} target="_blank" rel="noopener noreferrer">Abrir</a>}
          {p.publicada && <button type="button" className="btn s peq" disabled={salvando} onClick={() => salvar(false)}>Tirar do ar</button>}
        </div>
      </div>
      {aviso && <div className={`aviso mb ${aviso.ok ? "ok" : ""}`}>{aviso.texto}</div>}

      <div className="bio-editor">
        <div style={{ minWidth: 0 }}>
          <div className="chips mb" role="tablist">
            <button type="button" role="tab" aria-selected={aba === "conteudo"} className={`chip ${aba === "conteudo" ? "escolhido" : ""}`} onClick={() => setAba("conteudo")}>Conteúdo</button>
            <button type="button" role="tab" aria-selected={aba === "aparencia"} className={`chip ${aba === "aparencia" ? "escolhido" : ""}`} onClick={() => setAba("aparencia")}>Aparência</button>
          </div>

          {aba === "conteudo" ? (
            <>
              <div className="card mb">
                <h3 style={{ marginTop: 0 }}>Perfil</h3>
                <div className="linha" style={{ gap: 12 }}>
                  <span className="avatar grande" style={{ width: 72, height: 72, fontSize: 26 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.perfil.foto ? <img src={p.perfil.foto} alt="" /> : (p.perfil.nome || "?").charAt(0).toUpperCase()}
                  </span>
                  <label className="btn s peq" style={{ cursor: "pointer" }}>
                    Trocar a foto
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      try { mudar({ perfil: { ...p.perfil, foto: await fotoPequena(f) } }); } catch (x) { setAviso({ ok: false, texto: (x as Error).message }); }
                    }} />
                  </label>
                  {p.perfil.foto && <button type="button" className="link-loja" style={{ fontSize: 13.5, color: "var(--red)" }} onClick={() => { if (confirm("Tirar a foto da página?")) mudar({ perfil: { ...p.perfil, foto: null } }); }}>Tirar a foto</button>}
                </div>
                <div className="grade g2" style={{ gap: "0 12px" }}>
                  <div><label className="rotulo" htmlFor="bio-nome">Nome</label><input id="bio-nome" type="text" value={p.perfil.nome} onChange={(e) => mudar({ perfil: { ...p.perfil, nome: e.target.value } })} /></div>
                  <div><label className="rotulo" htmlFor="bio-arroba">＠ do Instagram</label><input id="bio-arroba" type="text" value={p.perfil.arroba} onChange={(e) => mudar({ perfil: { ...p.perfil, arroba: e.target.value.replace(/[@\s]/g, "") } })} /></div>
                </div>
                <label className="rotulo" htmlFor="bio-frase">Uma frase sobre a loja</label>
                <input id="bio-frase" type="text" maxLength={120} value={p.perfil.frase} onChange={(e) => mudar({ perfil: { ...p.perfil, frase: e.target.value } })} />
                <label className="rotulo" htmlFor="bio-slug">Endereço da página</label>
                <input id="bio-slug" type="text" value={p.slug} onChange={(e) => mudar({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} onBlur={() => mudar({ slug: slugDe(p.slug) })} />
                <p className="ajuda">O link fica: …/bio/?l=<b>{p.slug || "sua-loja"}</b></p>
              </div>

              <div className="secao">Blocos</div>
              {p.blocos.map((b, i) => (
                <div key={b.id} className="card mb">
                  <div className="linha entre" style={{ marginBottom: 4 }}>
                    <b>{NOME_BLOCO[b.tipo]}{i === 0 && b.tipo === "whatsapp" ? " · principal" : ""}</b>
                    <span className="linha" style={{ gap: 6 }}>
                      {dados.cliques[b.id] ? <span className="selo espera">{dados.cliques[b.id]} clique{dados.cliques[b.id] === 1 ? "" : "s"}</span> : null}
                      <button type="button" className="btn s peq" disabled={i === 0} aria-label="Subir bloco" onClick={() => mover(i, -1)}>↑</button>
                      <button type="button" className="btn s peq" disabled={i === p.blocos.length - 1} aria-label="Descer bloco" onClick={() => mover(i, 1)}>↓</button>
                    </span>
                  </div>
                  <CamposBloco b={b} mudar={(c) => mudarBloco(i, c)} />
                  <div className="mt"><Excluir pergunta={`Excluir o bloco "${rotuloDoBloco(b, dados.acao)}"?`} fazer={async () => undefined} aoFim={() => mudar({ blocos: p.blocos.filter((x) => x.id !== b.id) })} /></div>
                </div>
              ))}
              <div className="card linha" style={{ gap: 8 }}>
                <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as TipoBloco)} style={{ maxWidth: 280 }} aria-label="Tipo de bloco">
                  {TIPOS.map((t) => <option key={t} value={t}>{NOME_BLOCO[t]}</option>)}
                </select>
                <button type="button" className="btn p peq" onClick={() => mudar({ blocos: [...p.blocos, blocoNovo(novoTipo, portal.whatsapp ?? "")] })}>+ Adicionar bloco</button>
              </div>

              {p.id && (
                <div className="mt">
                  <Excluir rotulo="Apagar a página do Link da Bio" pergunta="Apagar a página do Link da Bio? O link para de funcionar e os cliques somem." fazer={() => apagarBio(p.id!)} aoFim={recarregar} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card mb">
                <h3 style={{ marginTop: 0 }}>Modelo</h3>
                <div className="bio-modelos">
                  {MODELOS.map((m) => (
                    <button key={m.id} type="button" aria-pressed={p.aparencia.modelo === m.id} className={`bio-modelo ${p.aparencia.modelo === m.id ? "escolhido" : ""}`} onClick={() => mudar({ aparencia: { ...p.aparencia, modelo: m.id } })} style={{ background: m.fundo, color: m.texto }}>
                      <span style={{ background: m.principal, color: m.principalTexto }}>WhatsApp</span>
                      <span style={{ background: m.botao, color: m.botaoTexto }}>Link</span>
                      <b>{m.nome}</b>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Formato do botão</h3>
                <div className="chips">
                  {FORMATOS.map((f) => <button key={f.id} type="button" aria-pressed={p.aparencia.botao === f.id} className={`chip ${p.aparencia.botao === f.id ? "escolhido" : ""}`} style={{ borderRadius: f.raio }} onClick={() => mudar({ aparencia: { ...p.aparencia, botao: f.id } })}>{f.nome}</button>)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bio-previa">
          <small className="mudo">Prévia no celular</small>
          <div className="bio-celular"><BioPagina p={{ ...p, acao: dados.acao }} previa /></div>
        </div>
      </div>
    </>
  );
}
