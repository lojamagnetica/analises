"use client";

import { useEffect, useState } from "react";
import { RascunhoClientes } from "@/components/RascunhoClientes";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarMetodoClientes, estadoConteudo } from "@/lib/clientes";

const ETAPAS = [["antes", "Antes da compra"], ["durante", "Durante a compra"], ["depois", "Depois da compra"]] as const;

export default function Experiencia() {
  const { portal, equipe } = usePortal();
  const { dados } = useDados(async () => ({ m: await buscarMetodoClientes() }), []);
  // O que a loja já faz fica marcado neste aparelho.
  const chave = `lm_experiencia_${portal.id}`;
  const [feitos, setFeitos] = useState<string[]>([]);
  useEffect(() => {
    try { setFeitos(JSON.parse(localStorage.getItem(chave) ?? "[]")); } catch { setFeitos([]); }
  }, [chave]);
  if (!dados) return <Carregando />;
  const { m } = dados;
  const estado = estadoConteudo(m, equipe);
  const voltar = { href: "/clientes", rotulo: "Minhas clientes" };

  if (estado === "preparo" || !m) {
    return (
      <>
        <Titulo titulo="Experiência do cliente" voltar={voltar} />
        <div className="card">
          <h2>Em preparação pela equipe</h2>
          <p className="mudo" style={{ margin: 0 }}>O checklist do que a cliente vive antes, durante e depois da compra está sendo preparado. Assim que estiver pronto, aparece aqui.</p>
        </div>
      </>
    );
  }

  const marcar = (id: string, sim: boolean) => {
    const novos = sim ? [...feitos, id] : feitos.filter((x) => x !== id);
    setFeitos(novos);
    try { localStorage.setItem(chave, JSON.stringify(novos)); } catch { /* sem armazenamento */ }
  };
  const total = ETAPAS.reduce((s, [k]) => s + (m.experiencia?.[k]?.length ?? 0), 0);
  const marcados = ETAPAS.reduce((s, [k]) => s + (m.experiencia?.[k] ?? []).filter((_, i) => feitos.includes(`${k}-${i}`)).length, 0);

  return (
    <>
      <Titulo titulo="Experiência do cliente" voltar={voltar} sub={m.textos?.experiencia_sub} />
      {estado === "rascunho" && <RascunhoClientes />}
      <p className="mudo">Marque o que a sua loja já faz: {marcados} de {total}. As marcações ficam salvas neste aparelho.</p>
      <div className="grade g3">
        {ETAPAS.map(([k, titulo]) => (
          <div key={k} className="card card-borda">
            <h3 style={{ textTransform: "uppercase" }}>{titulo}</h3>
            {(m.experiencia?.[k] ?? []).map((item, i) => {
              const id = `${k}-${i}`;
              const feito = feitos.includes(id);
              return (
                <label key={id} className={`marcar ${feito ? "feito" : ""}`}>
                  <input type="checkbox" checked={feito} onChange={(e) => marcar(id, e.target.checked)} />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
