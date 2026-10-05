"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icone } from "@/components/Icone";

function ler(chave: string) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}

/** Botões redondos do topo: ajuda, atualizar, largura, letra, modo escuro, notas e assistente. */
export function Ferramentas({ temPortal }: { temPortal: boolean }) {
  const router = useRouter();

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
        {temPortal && <Link className="redondo" href="/duvidas" title="Dúvidas"><Icone nome="help" /></Link>}
        <button className="redondo" title="Atualizar" onClick={() => router.refresh()}><Icone nome="refresh" /></button>
        <button className="redondo esconde-mobile" title="Largura da tela" onClick={alternarLargura}><Icone nome="width" /></button>
        <button className="redondo" title="Aumentar letra" onClick={aumentarLetra}><Icone nome="font" /></button>
        <button className="redondo" title="Modo escuro" onClick={alternarTema}><Icone nome="moon" /></button>
        {temPortal && <Link className="redondo" href="/notas" title="Notas"><Icone nome="note" /></Link>}
        {temPortal && <Link className="redondo ia" href="/assistente" title="Assistente Magnética"><Icone nome="robot" /></Link>}
      </div>
    </div>
  );
}
