"use client";

import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { excluirAcesso, listarAcessos, salvarAcesso, verSenha, type Acesso } from "@/lib/acessos";

type Edicao = { id?: string; ferramenta: string; link: string; login: string; obs: string; senha: string; trocarSenha: boolean };
const novo = (): Edicao => ({ ferramenta: "", link: "", login: "", obs: "", senha: "", trocarSenha: true });

function Formulario({ e, setE, aoSalvar, aoCancelar }: { e: Edicao; setE: (x: Edicao) => void; aoSalvar: () => void; aoCancelar: () => void }) {
  const [erro, setErro] = useState("");
  return (
    <form className="mt" onSubmit={async (ev) => {
      ev.preventDefault(); setErro("");
      try { await salvarAcesso(e, e.trocarSenha ? e.senha : undefined); aoSalvar(); } catch (x) { setErro((x as Error).message); }
    }}>
      <div className="grade g2" style={{ gap: "0 10px" }}>
        <label className="ajuda">Ferramenta<input type="text" required value={e.ferramenta} placeholder="Ex.: Canva" onChange={(x) => setE({ ...e, ferramenta: x.target.value })} /></label>
        <label className="ajuda">Link de acesso<input type="text" value={e.link} placeholder="https://" onChange={(x) => setE({ ...e, link: x.target.value })} /></label>
        <label className="ajuda">Login ou e-mail<input type="text" value={e.login} autoComplete="off" onChange={(x) => setE({ ...e, login: x.target.value })} /></label>
        {e.trocarSenha
          ? <label className="ajuda">Senha {e.id ? "(nova)" : ""}<input type="password" value={e.senha} autoComplete="new-password" placeholder={e.id ? "Deixe em branco para apagar a senha" : ""} onChange={(x) => setE({ ...e, senha: x.target.value })} /></label>
          : <div className="ajuda" style={{ alignSelf: "end" }}><button type="button" className="btn s peq" onClick={() => setE({ ...e, trocarSenha: true })}>Trocar a senha</button></div>}
      </div>
      <label className="ajuda" style={{ display: "block" }}>Observação<input type="text" value={e.obs} placeholder="Ex.: código de verificação vai para o celular da Camilla" onChange={(x) => setE({ ...e, obs: x.target.value })} /></label>
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha" style={{ gap: 8 }}>
        <button type="submit" className="btn p peq">Salvar</button>
        <button type="button" className="btn s peq" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function Linha({ a, recarregar }: { a: Acesso; recarregar: () => void }) {
  const [senha, setSenha] = useState<string | null>(null);
  const [ed, setEd] = useState<Edicao | null>(null);
  const [erro, setErro] = useState("");
  const link = /^https?:\/\//.test(a.link) ? a.link : "";
  return (
    <div className="card mb">
      <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 16 }}>{a.ferramenta}</b>
          <br /><small className="mudo">{a.login || "sem login"}{a.obs ? ` · ${a.obs}` : ""} · atualizado em {dataCurta(a.updated_at)}</small>
        </div>
        <div className="linha" style={{ gap: 8, flexWrap: "wrap" }}>
          {link && <a className="btn s peq" href={link} target="_blank" rel="noopener">Abrir</a>}
          {a.login && <Copiar texto={a.login} rotulo="Copiar login" />}
          {a.segredo
            ? (senha === null
              ? <button type="button" className="btn s peq" onClick={async () => { setErro(""); try { setSenha(await verSenha(a.id)); setTimeout(() => setSenha(null), 30000); } catch (x) { setErro((x as Error).message); } }}>Ver senha</button>
              : <><code style={{ padding: "4px 8px", background: "var(--soft)", borderRadius: 8 }}>{senha}</code><Copiar texto={senha} rotulo="Copiar senha" /></>)
            : <small className="mudo">sem senha guardada</small>}
          <button type="button" className="link-loja" onClick={() => setEd({ id: a.id, ferramenta: a.ferramenta, link: a.link, login: a.login, obs: a.obs, senha: "", trocarSenha: !a.segredo })}>Editar</button>
          <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
            if (!confirm(`Excluir o acesso "${a.ferramenta}" e a senha guardada? Não dá para desfazer.`)) return;
            try { await excluirAcesso(a.id); recarregar(); } catch (x) { setErro((x as Error).message); }
          }}>Excluir</button>
        </div>
      </div>
      {erro && <div className="aviso mt">{erro}</div>}
      {ed && <Formulario e={ed} setE={setEd} aoSalvar={() => { setEd(null); setSenha(null); recarregar(); }} aoCancelar={() => setEd(null)} />}
    </div>
  );
}

/** As senhas de tudo o que a empresa usa, num lugar só para a equipe. */
export default function Acessos() {
  const { dados, recarregar } = useDados(() => listarAcessos(), []);
  const [ed, setEd] = useState<Edicao | null>(null);
  const [busca, setBusca] = useState("");
  if (!dados) return <Carregando />;
  const lista = dados.filter((a) => !busca || `${a.ferramenta} ${a.login}`.toLowerCase().includes(busca.toLowerCase()));
  return (
    <>
      <Titulo titulo="Acessos" sub="Login e senha de tudo o que a empresa usa, para a equipe toda. A senha fica guardada com criptografia e só aparece quando alguém clica em Ver senha (some sozinha em 30 segundos)." />
      <div className="linha mb" style={{ gap: 8, flexWrap: "wrap" }}>
        <input type="search" value={busca} placeholder="Buscar ferramenta" onChange={(e) => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200, marginTop: 0 }} />
        {!ed && <button type="button" className="btn p" onClick={() => setEd(novo())}>+ Novo acesso</button>}
      </div>
      {ed && <div className="card mb"><b>Novo acesso</b><Formulario e={ed} setE={setEd} aoSalvar={() => { setEd(null); recarregar(); }} aoCancelar={() => setEd(null)} /></div>}
      {lista.map((a) => <Linha key={a.id} a={a} recarregar={recarregar} />)}
      {!lista.length && <div className="card mudo">Nenhum acesso{busca ? " com esse nome" : ""}.</div>}
    </>
  );
}
