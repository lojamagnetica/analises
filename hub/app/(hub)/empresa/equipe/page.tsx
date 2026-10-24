"use client";

import { useState } from "react";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { convidarEquipe, equipeFuncao, equipeRemover } from "@/lib/acoes";
import type { PessoaEquipe } from "@/lib/carteira";
import { haQuanto } from "@/lib/formato";

export default function Equipe() {
  const hub = useEquipe();
  const [convite, setConvite] = useState<{ link?: string; nome?: string; erro?: string }>({});
  const [salvo, setSalvo] = useState("");
  const { dados, recarregar } = useDados(async () => {
    const { data } = await supabaseBrowser().from("perfis").select("id, nome, email, funcao, ultimo_acesso").eq("papel", "equipe").order("nome");
    return (data ?? []) as PessoaEquipe[];
  }, []);
  if (!dados) return <Carregando />;

  const mensagem = (link: string, nome?: string) =>
    `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Este é o seu acesso ao magnética.hub.\n\nEntre por este link para criar a sua senha:\n${link}`;

  return (
    <>
      <Titulo titulo="Equipe" sub="Quem trabalha no Hub. Toda a equipe vê tudo; cada cliente vê só o próprio portal." />
      {convite.link && (
        <div className="card card-borda mb" style={{ ["--c" as string]: "var(--green)" }}>
          <h3>Link de acesso pronto</h3>
          <p className="mudo" style={{ fontSize: 14 }}>Mande para a pessoa. O link é de uso único; se vencer, gere outro aqui.</p>
          <input type="text" readOnly value={convite.link} />
          <div className="linha mt"><Copiar texto={mensagem(convite.link, convite.nome)} rotulo="Copiar mensagem" /></div>
        </div>
      )}
      {convite.erro && <div className="aviso mb">{convite.erro}</div>}

      <div className="grade g2">
        <div className="card">
          <h2>Pessoas da equipe</h2>
          {dados.map((p) => (
            <form
              key={p.id}
              className="marcar"
              style={{ display: "block", cursor: "default" }}
              action={async (f) => { await equipeFuncao(p.id, String(f.get("funcao") ?? "")); setSalvo(p.id); recarregar(); }}
            >
              <div className="linha entre">
                <div>
                  <b>{p.nome ?? p.email}</b>{p.id === hub.userId && <span className="mudo"> (você)</span>}
                  <div className="mudo" style={{ fontSize: 13 }}>{p.email} · último acesso {haQuanto(p.ultimo_acesso)}</div>
                </div>
              </div>
              <div className="linha mt" style={{ flexWrap: "nowrap" }}>
                <input type="text" name="funcao" defaultValue={p.funcao ?? ""} placeholder="Função (ex.: CS e ADM)" />
                <button className="btn s peq" type="submit">Salvar</button>
                {p.id !== hub.userId && (
                  <button
                    className="btn s peq"
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Tirar ${p.nome ?? p.email} da equipe? A pessoa perde o acesso ao Hub da empresa.`)) return;
                      await equipeRemover(p.id);
                      recarregar();
                    }}
                  >Remover</button>
                )}
              </div>
              {salvo === p.id && <small className="mudo">Função salva.</small>}
            </form>
          ))}
        </div>

        <form
          className="card"
          action={async (f) => {
            setConvite({});
            try {
              const nome = String(f.get("nome") ?? "");
              setConvite({ link: await convidarEquipe(f), nome });
              recarregar();
            } catch (e) {
              setConvite({ erro: (e as Error).message });
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <h2>Convidar para a equipe</h2>
          <label className="rotulo">Nome</label>
          <input type="text" name="nome" required />
          <label className="rotulo">E-mail</label>
          <input type="email" name="email" required />
          <label className="rotulo">Função</label>
          <input type="text" name="funcao" placeholder="Ex.: Comercial, CS e ADM" />
          <p className="ajuda">A pessoa entra com acesso de equipe: vê todas as clientes, a Gestão de Clientes e o painel.</p>
          <div className="linha mt"><button className="btn p" type="submit">Gerar link de acesso</button></div>
        </form>
      </div>
    </>
  );
}
