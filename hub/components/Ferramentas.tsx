"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { supabaseBrowser } from "@/lib/supabase/client";

function ler(chave: string) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}

/** Quantas mensagens do Fale com a Camilla esperam resposta (a cada troca de página e a cada minuto). */
function useCaixa(ligado: boolean) {
  const caminho = usePathname();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!ligado) return;
    const contar = () => supabaseBrowser().from("solicitacoes").select("id", { count: "exact", head: true }).in("status", ["Recebida", "Em andamento"])
      .then(({ count }) => setN(count ?? 0));
    contar();
    const t = setInterval(contar, 60_000);
    return () => clearInterval(t);
  }, [ligado, caminho]);
  return n;
}

/** Botões redondos do topo: atualizar, largura, letra, modo escuro, notas e assistente. Para a equipe, a Caixa do Fale com a Camilla. */
export function Ferramentas({ temPortal, equipe = false }: { temPortal: boolean; equipe?: boolean }) {
  const router = useRouter();
  const esperando = useCaixa(equipe);

  useEffect(() => {
    const r = document.documentElement;
    const tema = ler("lm_tema"); if (tema) r.dataset.theme = tema;
    const largo = ler("lm_largo"); if (largo) r.dataset.largo = largo;
    const fs = ler("lm_fs"); if (fs) r.style.setProperty("--fs", fs);
  }, []);

  const alternarTema = () => {
    const r = document.documentElement;
    const escuro = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    r.dataset.theme = escuro ? "light" : "dark";
    gravar("lm_tema", r.dataset.theme);
  };
  const alternarLargura = () => {
    const r = document.documentElement;
    r.dataset.largo = r.dataset.largo === "1" ? "0" : "1";
    gravar("lm_largo", r.dataset.largo);
  };
  const aumentarLetra = () => {
    const r = document.documentElement;
    const atual = parseFloat(getComputedStyle(r).getPropertyValue("--fs")) || 15;
    const novo = `${atual >= 18 ? 15 : atual + 1.5}px`;
    r.style.setProperty("--fs", novo);
    gravar("lm_fs", novo);
  };

  return (
    <div className="topo">
      <button className="redondo hamb" aria-label="Abrir menu" onClick={() => window.dispatchEvent(new Event("abrir-menu"))}>
        <Icone nome="menu" />
      </button>
      <div className="ferramentas">
        {equipe && (
          <Link className={`caixa-topo${esperando ? " pendente" : ""}`} href="/equipe/duvidas" title="Caixa do Fale com a Camilla">
            <Icone nome="inbox" /><span>Fale com a Camilla</span>{esperando > 0 && <b>{esperando}</b>}
          </Link>
        )}
        <button className="redondo" title="Atualizar" onClick={() => router.refresh()}><Icone nome="refresh" /></button>
        <button className="redondo esconde-mobile" title="Largura da tela" onClick={alternarLargura}><Icone nome="width" /></button>
        <button className="redondo" title="Aumentar letra" onClick={aumentarLetra}><Icone nome="font" /></button>
        <button className="redondo" title="Modo escuro" onClick={alternarTema}><Icone nome="moon" /></button>
        {temPortal && <Link className="redondo" href="/notas" title="Notas"><Icone nome="note" /></Link>}
        {temPortal && <Link className="redondo ia" href="/assistente" title="Fale com a Camilla"><Icone nome="chat" /></Link>}
      </div>
    </div>
  );
}
