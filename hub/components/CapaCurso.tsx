import { Simbolo } from "@/components/Simbolo";

// Capa das aulas na área de membros: black com o laranja da marca, o código grande e o símbolo de ímã.
// Cada pilar muda só a luz da capa (o 04 é a capa clara), para as fileiras não ficarem iguais.
export function CapaCurso({ codigo, titulo, topo, pilar, progresso, bloqueado, feito, grande }: {
  codigo: string; titulo?: string; topo?: string; pilar?: string | null;
  progresso?: number; bloqueado?: boolean; feito?: boolean; grande?: boolean;
}) {
  return (
    <div className={`capa-curso p${pilar ?? "x"}${bloqueado ? " bloq" : ""}${grande ? " grande" : ""}`}>
      <div className="capa-topo">
        {topo && <span>{topo}</span>}
        {feito && <span className="capa-ok">✓</span>}
      </div>
      <div className="capa-ima"><Simbolo /></div>
      <div className="capa-base">
        <b className="capa-num">{codigo}</b>
        {titulo && <span className="capa-tit">{titulo}</span>}
      </div>
      {bloqueado && <div className="capa-cadeado" aria-label="bloqueado">🔒</div>}
      {progresso != null && progresso > 0 && <i className="capa-prog" style={{ width: `${Math.min(progresso, 1) * 100}%` }} />}
    </div>
  );
}
