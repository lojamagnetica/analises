"use client";

import { useEffect, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, usePortal } from "@/lib/hub";
import { buscarCursoAberto, salvarCursoAberto } from "@/lib/curso";

/** O curso com cadeado: a loja vê o aviso até a Camilla liberar; a equipe vê o curso e o botão de liberar. */
export default function LayoutCurso({ children }: { children: React.ReactNode }) {
  const { portal, equipe } = usePortal();
  const [aberto, setAberto] = useState<boolean | null>(null);
  useEffect(() => { buscarCursoAberto().then(setAberto); }, []);
  if (aberto === null) return <Carregando />;
  const trancado = !aberto && !equipe && portal?.tipo !== "Curso";
  if (trancado) {
    return (
      <>
        <Titulo titulo="Curso · Método Loja Magnética" />
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h2 style={{ margin: "8px 0" }}>O curso abre em breve</h2>
          <p className="mudo" style={{ margin: 0 }}>A Camilla libera as aulas na próxima semana.</p>
        </div>
      </>
    );
  }
  return (
    <>
      {equipe && !aberto && (
        <div className="aviso mb">
          🔒 O curso está fechado para as lojas de mentoria e consultoria (quem comprou só o curso continua com acesso).{" "}
          <button type="button" className="btn p peq" style={{ marginLeft: 8 }} onClick={async () => {
            if (confirm("Liberar o curso para todas as lojas?")) { await salvarCursoAberto(true); setAberto(true); }
          }}>Liberar o curso</button>
        </div>
      )}
      {equipe && aberto && (
        <p className="ajuda" style={{ textAlign: "right", margin: "0 0 8px" }}>
          Curso aberto para as lojas. <button type="button" className="link-loja" onClick={async () => {
            if (confirm("Fechar o curso com cadeado para as lojas de mentoria e consultoria?")) { await salvarCursoAberto(false); setAberto(false); }
          }}>Fechar com cadeado</button>
        </p>
      )}
      {children}
    </>
  );
}
