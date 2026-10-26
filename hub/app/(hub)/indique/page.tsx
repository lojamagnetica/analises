"use client";

import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, primeiroNome, useDados, usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { Excluir } from "@/components/Excluir";
import { SELO_SITUACAO, buscarIndique, editarIndicacao, indicarLoja, mensagemIndicacao, retirarIndicacao, salvarPremio, type Indicacao } from "@/lib/indique";

/** Uma indicação da lista: enquanto está como Recebida, dá para corrigir ou retirar. */
function Linha({ i, portalId, aoMudar }: { i: Indicacao; portalId: string; aoMudar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const mexe = i.situacao === "Recebida";
  return (
    <div className="marcar" style={{ cursor: "default", display: "block" }}>
      <div className="linha entre">
        <span><b>{i.nome}</b>{i.loja && <span className="mudo"> · {i.loja}</span>}<br /><small className="mudo">indicada em {dataCurta(i.criada_em)}</small></span>
        <span className={`selo ${SELO_SITUACAO[i.situacao] ?? "espera"}`}>{i.situacao}</span>
      </div>
      {mexe && !editando && (
        <div className="linha" style={{ gap: 12, marginTop: 6 }}>
          <button type="button" className="link-loja" style={{ fontSize: 13.5 }} onClick={() => setEditando(true)}>Editar</button>
          <Excluir rotulo="Retirar" pergunta={`Retirar a indicação de ${i.nome}? A equipe não vai chamar ela.`} fazer={() => retirarIndicacao(portalId, i.id)} aoFim={aoMudar} />
        </div>
      )}
      {editando && (
        <form className="mt" action={async (f) => {
          setErro("");
          try { await editarIndicacao(portalId, i.id, f); setEditando(false); aoMudar(); } catch (e) { setErro((e as Error).message); }
        }}>
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <div><label className="rotulo">Nome</label><input name="nome" type="text" defaultValue={i.nome} required /></div>
            <div><label className="rotulo">Loja</label><input name="loja" type="text" defaultValue={i.loja ?? ""} /></div>
            <div><label className="rotulo">WhatsApp</label><input name="whatsapp" type="text" defaultValue={i.whatsapp ?? ""} required /></div>
            <div><label className="rotulo">Instagram</label><input name="instagram" type="text" defaultValue={i.instagram ?? ""} /></div>
          </div>
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt" style={{ gap: 6 }}>
            <button className="btn p peq" type="submit">Salvar</button>
            <button className="btn s peq" type="button" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Equipe: o prêmio da indicação, que vale para todas as lojas. */
function ConfigPremio({ texto, aoSalvar }: { texto: string; aoSalvar: () => void }) {
  const [ok, setOk] = useState("");
  return (
    <form className="card mb" action={async (f) => {
      setOk("");
      try { await salvarPremio(String(f.get("premio") ?? "")); setOk("Prêmio salvo para todas as lojas."); aoSalvar(); } catch (e) { setOk((e as Error).message); }
    }}>
      <h3 style={{ marginTop: 0 }}>Prêmio da indicação (só a equipe vê esta caixa)</h3>
      <textarea name="premio" rows={2} defaultValue={texto} placeholder="Ex.: Indicou e ela entrou? Você ganha… (deixe vazio para não mostrar prêmio)" />
      {ok && <div className="aviso ok mt">{ok}</div>}
      <button className="btn p peq mt" type="submit">Salvar prêmio</button>
    </form>
  );
}

export default function Indique() {
  const { portal, equipe } = usePortal();
  const [nome, setNome] = useState("");
  const [enviada, setEnviada] = useState("");
  const [erro, setErro] = useState("");
  const [chave, setChave] = useState(0);
  const { dados, recarregar } = useDados(() => buscarIndique(portal.id), [portal.id]);
  if (!dados) return <Carregando />;

  return (
    <>
      <Titulo titulo="Indique uma loja 🎁" sub="Conhece uma lojista que ia gostar da mentoria? Indique aqui e a equipe chama ela para conversar." />
      {equipe && <ConfigPremio texto={dados.premio} aoSalvar={recarregar} />}
      {dados.premio && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--orange)", maxWidth: 760 }}>
          <b>🎁 Prêmio da indicação</b>
          <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{dados.premio}</p>
        </div>
      )}

      <div className="grade g2" style={{ alignItems: "start" }}>
        <form key={chave} className="card" action={async (f) => {
          setErro(""); setEnviada("");
          try {
            await indicarLoja(portal.id, f);
            setEnviada(String(f.get("nome") ?? "")); setNome(""); setChave((c) => c + 1); recarregar();
          } catch (e) { setErro((e as Error).message); }
        }}>
          <h3 style={{ marginTop: 0 }}>Quem você quer indicar?</h3>
          <div className="grade g2" style={{ gap: "0 12px" }}>
            <div><label className="rotulo" htmlFor="nome">Nome *</label><input id="nome" name="nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><label className="rotulo" htmlFor="loja">Loja</label><input id="loja" name="loja" type="text" /></div>
            <div><label className="rotulo" htmlFor="whatsapp">WhatsApp com DDD *</label><input id="whatsapp" name="whatsapp" type="text" inputMode="tel" required placeholder="(81) 9…" /></div>
            <div><label className="rotulo" htmlFor="instagram">Instagram da loja</label><input id="instagram" name="instagram" type="text" placeholder="@" /></div>
            <div><label className="rotulo" htmlFor="cidade">Cidade</label><input id="cidade" name="cidade" type="text" /></div>
          </div>
          <label className="rotulo" htmlFor="motivo">Por que você lembrou dela?</label>
          <textarea id="motivo" name="motivo" rows={3} placeholder="Ex.: a loja dela cresceu e ela está sem tempo para organizar a equipe" />
          <label className="marcar">
            <input type="checkbox" name="sabe" required />
            <span>Ela sabe que vou indicar e topou receber o contato da equipe.</span>
          </label>
          {erro && <div className="aviso mt">{erro}</div>}
          {enviada && <div className="aviso ok mt">Indicação enviada! A equipe vai chamar {primeiroNome(enviada)} no WhatsApp.</div>}
          <button className="btn p mt" type="submit">Enviar indicação</button>
        </form>

        <div>
          <div className="card mb">
            <h3 style={{ marginTop: 0 }}>Antes de indicar, avise a pessoa</h3>
            <p className="mudo" style={{ marginTop: 0 }}>Copie a mensagem, mande no WhatsApp dela e só depois preencha a indicação.</p>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, background: "var(--soft)", borderRadius: 12, padding: 12 }}>{mensagemIndicacao(primeiroNome(nome))}</pre>
            <Copiar texto={mensagemIndicacao(primeiroNome(nome))} rotulo="Copiar mensagem pronta" />
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Suas indicações</h3>
            <p className="ajuda" style={{ marginTop: -6 }}>Enquanto está como Recebida, você pode corrigir ou retirar. Depois que a equipe chama, fale com a Camilla.</p>
            {!dados.indicacoes.length && <p className="mudo" style={{ margin: 0 }}>Você ainda não indicou ninguém.</p>}
            {dados.indicacoes.map((i) => <Linha key={i.id} i={i} portalId={portal.id} aoMudar={recarregar} />)}
          </div>
        </div>
      </div>
    </>
  );
}
