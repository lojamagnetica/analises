"use client";

import Link from "next/link";
import { useState } from "react";
import { CamposPessoa } from "@/components/CamposPessoa";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { buscarMetodo, buscarPessoas, linkDoTeste, pessoaSalvar, principal } from "@/lib/pessoas";

/** Etapa Time de vendas: cadastrar quem atende e mandar o teste de perfil para cada pessoa. Alimenta o Diagnóstico. */
export function EquipeDaEtapa({ portalId }: { portalId: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarPessoas(portalId)), m: await buscarMetodo() }), [portalId]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const semPerfil = ativos.filter((p) => !p.perfil).length;

  return (
    <div className="card mb card-borda" style={{ ["--c" as string]: "var(--purple)", maxWidth: 720 }}>
      <div className="linha entre">
        <h2 style={{ margin: 0 }}>Seu time · {ativos.length} {ativos.length === 1 ? "pessoa" : "pessoas"}</h2>
        <button className="btn p peq" type="button" onClick={() => setAberto(!aberto)}>+ Adicionar pessoa</button>
      </div>
      <p className="mudo" style={{ marginTop: 6 }}>Cadastre quem trabalha com você e mande o teste de perfil para cada pessoa. São 24 situações de loja, levam uns 5 minutos e entram no seu Diagnóstico.</p>
      {aberto && (
        <form className="mb" action={async (f) => {
          setErro("");
          try { await pessoaSalvar(portalId, null, f); setAberto(false); recarregar(); } catch (e) { setErro((e as Error).message); }
        }}>
          <CamposPessoa m={m} />
          <div className="linha mt"><button className="btn p peq" type="submit">Salvar pessoa</button></div>
        </form>
      )}
      {erro && <div className="aviso mb">{erro}</div>}
      {semPerfil > 0 && <div className="aviso mb">{semPerfil === 1 ? "Falta o teste de 1 pessoa." : `Faltam os testes de ${semPerfil} pessoas.`}</div>}
      {ativos.map((p) => {
        const pr = principal(p.perfil);
        const link = links[p.id];
        const nome = p.nome.split(" ")[0];
        const msg = link ? `Oi, ${nome}! Responde este teste rapidinho? Leva uns 5 minutos e não tem resposta certa: é para a gente te conhecer melhor e saber como te ajudar no dia a dia.\n\n${link}` : "";
        return (
          <div key={p.id} className="marcar" style={{ cursor: "default", display: "block" }}>
            <div className="linha entre">
              <span><b>{p.nome}</b> <small className="mudo">{p.funcao ? `· ${p.funcao}` : ""}</small></span>
              {pr
                ? <span className="selo feito">perfil: {m.perfis[pr.letra].nome}</span>
                : (
                  <span className="linha" style={{ gap: 6 }}>
                    <button type="button" className="btn s peq" onClick={async () => {
                      setErro("");
                      try { const l = await linkDoTeste(p.id, `${window.location.origin}${BASE}`); setLinks((x) => ({ ...x, [p.id]: l })); } catch (e) { setErro((e as Error).message); }
                    }}>Enviar o teste</button>
                    <Link className="btn s peq" href={`/pessoas/teste?id=${p.id}`}>Fazer aqui</Link>
                  </span>
                )}
            </div>
            {link && (
              <div className="linha mt" style={{ gap: 8 }}>
                <Copiar texto={msg} rotulo="Copiar mensagem com o link" />
                <a className="btn s peq" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
