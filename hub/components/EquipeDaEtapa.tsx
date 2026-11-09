"use client";

import Link from "next/link";
import { useState } from "react";
import { CamposPessoa } from "@/components/CamposPessoa";
import { Copiar } from "@/components/Copiar";
import { Carregando, useDados } from "@/lib/hub";
import { BASE } from "@/lib/config";
import { buscarMetodo, buscarPessoas, linkDoTeste, pessoaDesligar, pessoaSalvar, principal, type Pessoa } from "@/lib/pessoas";

/** Pessoa de exemplo da demonstração do onboarding (não existe no banco). */
const exemplo = (portalId: string, id: string, nome: string, funcao: string | null): Pessoa =>
  ({ id, portal_id: portalId, nome, funcao, entrada: null, ativo: true, respostas: null, perfil: null, respondido_por: null, perfil_em: null, motor: null });

/** Etapa Time de vendas: cadastrar quem atende e mandar o teste de perfil para cada pessoa. Alimenta o Diagnóstico.
 *  Na demonstração do onboarding (demo), já vem uma pessoa de exemplo e o cadastro fica aberto: tudo acontece só
 *  na tela, sem gravar, para a Claudia mostrar que depois de cadastrar já dá para mandar o teste de perfil. */
export function EquipeDaEtapa({ portalId, demo = false }: { portalId: string; demo?: boolean }) {
  const [aberto, setAberto] = useState(demo);
  const [deMentira, setDeMentira] = useState<Pessoa[]>(() => [exemplo(portalId, "exemplo-1", "Maria (exemplo)", "Vendedora")]);
  const [erro, setErro] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const { dados, recarregar } = useDados(async () => ({ ...(await buscarPessoas(portalId)), m: await buscarMetodo() }), [portalId]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const ativos = demo ? deMentira : dados.pessoas.filter((p) => p.ativo);
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
          if (demo) {
            const nome = String(f.get("nome") ?? "").trim();
            if (nome) setDeMentira((l) => [...l, exemplo(portalId, `exemplo-${Date.now()}`, nome, String(f.get("funcao") ?? "").trim() || null)]);
            setAberto(false);
            return;
          }
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
          <div key={p.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div className="linha entre">
              <span>
                <b>{p.nome}</b> <small className="mudo">{p.funcao ? `· ${p.funcao}` : ""}</small>
                <span className="linha" style={{ gap: 10, display: "inline-flex", marginLeft: 10 }}>
                  <button type="button" className="link-loja" onClick={() => setEditando(editando === p.id ? null : p.id)}>Editar</button>
                  <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={async () => {
                    if (!confirm(`Remover ${p.nome} do seu time?`)) return;
                    setErro("");
                    if (demo) { setDeMentira((l) => l.filter((x) => x.id !== p.id)); return; }
                    try { await pessoaDesligar(p.id, false); recarregar(); } catch (e) { setErro((e as Error).message); }
                  }}>Remover</button>
                </span>
              </span>
              {pr
                ? <span className="selo feito">perfil: {m.perfis[pr.letra].nome}</span>
                : (
                  <span className="linha" style={{ gap: 6 }}>
                    <button type="button" className="btn s peq" onClick={async () => {
                      setErro("");
                      if (demo) { setLinks((x) => ({ ...x, [p.id]: `${window.location.origin}${BASE}/t/exemplo` })); return; }
                      try { const l = await linkDoTeste(p.id, `${window.location.origin}${BASE}`); setLinks((x) => ({ ...x, [p.id]: l })); } catch (e) { setErro((e as Error).message); }
                    }}>Enviar o teste</button>
                    {!demo && <Link className="btn s peq" href={`/pessoas/teste?id=${p.id}`}>Fazer aqui</Link>}
                  </span>
                )}
            </div>
            {editando === p.id && (
              <form className="mt" action={async (f) => {
                setErro("");
                if (demo) {
                  setDeMentira((l) => l.map((x) => x.id === p.id ? { ...x, nome: String(f.get("nome") ?? x.nome), funcao: String(f.get("funcao") ?? "") || null } : x));
                  setEditando(null);
                  return;
                }
                try { await pessoaSalvar(portalId, p.id, f); setEditando(null); recarregar(); } catch (e) { setErro((e as Error).message); }
              }}>
                <CamposPessoa p={p} m={m} />
                <div className="linha mt" style={{ gap: 8 }}>
                  <button className="btn p peq" type="submit">Salvar</button>
                  <button className="btn s peq" type="button" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </form>
            )}
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
