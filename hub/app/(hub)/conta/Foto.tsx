"use client";

import { useRef, useState } from "react";
import { salvarFoto } from "@/lib/acoes";
import { useHub } from "@/lib/hub";

/** Foto de perfil: aparece no rodapé do menu, no lugar da inicial. */
export function Foto() {
  const hub = useHub();
  const campo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function trocar(arquivo: File | null) {
    setSalvando(true);
    setAviso(null);
    try {
      await salvarFoto(arquivo);
      await hub.recarregar();
      setAviso({ ok: true, texto: arquivo ? "Foto salva." : "Foto removida." });
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "Não deu para salvar a foto." });
    }
    setSalvando(false);
    if (campo.current) campo.current.value = "";
  }

  return (
    <div className="card mb" id="foto">
      <h3>Sua foto</h3>
      <div className="linha">
        <div className="avatar grande">
          {hub.foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={hub.foto} alt="Sua foto" />
            : (hub.nome || "?").trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="mudo" style={{ margin: "0 0 10px" }}>Aparece embaixo, no menu, junto com o seu nome. Use uma foto do rosto, de frente.</p>
          <div className="linha">
            <input ref={campo} type="file" accept="image/*" hidden onChange={(e) => trocar(e.target.files?.[0] ?? null)} />
            <button className="btn p" type="button" disabled={salvando} onClick={() => campo.current?.click()}>
              {salvando ? "Salvando…" : hub.foto ? "Trocar foto" : "Colocar foto"}
            </button>
            {hub.foto && <button className="btn s" type="button" disabled={salvando} onClick={() => trocar(null)}>Remover</button>}
          </div>
        </div>
      </div>
      {aviso && <div className={`aviso mt${aviso.ok ? " ok" : ""}`}>{aviso.texto}</div>}
    </div>
  );
}
