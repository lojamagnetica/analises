"use client";

// O que a loja usa durante toda a mentoria (não é passo da jornada): fica sempre à mão.
import Link from "next/link";

const ITENS = [
  { href: "/cursos", titulo: "Ferramentas", texto: "O curso da metodologia completo, para consultar quando precisar." },
  { href: "/planeje", titulo: "Planejamento do mês", texto: "O plano de cada mês: metas, ações, datas e conteúdo." },
  { href: "/reunioes", titulo: "Reuniões e encontros", texto: "As reuniões marcadas, as gravações e os resumos." },
  { href: "/recebidos", titulo: "O que você recebeu", texto: "Tudo o que a Loja Magnética já entregou para a sua loja." },
];

export function SempreComVoce() {
  return (
    <>
      <div className="secao">Sempre com você, em todos os passos</div>
      <div className="grade g4 mb">
        {ITENS.map((i) => (
          <Link key={i.href} href={i.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <b>{i.titulo}</b>
            <p className="mudo" style={{ margin: "4px 0 0", fontSize: 14 }}>{i.texto}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
