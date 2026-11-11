"use client";

// Um anexo de uma mensagem das Conversas da equipe: foto com prévia ou arquivo com nome e tamanho.
import { useEffect, useState } from "react";
import { linkAnexo, type Anexo } from "@/lib/conversas";

const tamanho = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function AnexoDaMensagem({ a }: { a: Anexo }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { linkAnexo(a.caminho).then(setUrl); }, [a.caminho]);
  const imagem = a.tipo.startsWith("image/");
  return (
    <div style={{ margin: "4px 0" }}>
      {imagem && url && <a href={url} target="_blank" rel="noopener"><img src={url} alt={a.nome} style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block" }} /></a>}
      <a href={url ?? "#"} target="_blank" rel="noopener" onClick={(e) => { if (!url) e.preventDefault(); }} style={{ fontSize: 13, wordBreak: "break-all" }}>📎 {a.nome} <span className="mudo">· {tamanho(a.tamanho)}</span></a>
    </div>
  );
}
