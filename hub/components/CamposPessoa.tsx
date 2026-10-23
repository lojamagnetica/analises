import { MOTORES, type Motor } from "@/lib/pessoas";

export function CamposPessoa({ p }: { p?: { nome: string; funcao: string | null; entrada: string | null; motor: Motor | null } }) {
  return (
    <>
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Nome</label><input type="text" name="nome" required defaultValue={p?.nome ?? ""} /></div>
        <div><label className="rotulo">Função</label><input type="text" name="funcao" defaultValue={p?.funcao ?? ""} placeholder="Ex.: vendedora, caixa, gerente" /></div>
        <div><label className="rotulo">Na loja desde</label><input type="date" name="entrada" defaultValue={p?.entrada ?? ""} /></div>
        <div>
          <label className="rotulo">O motor do querer</label>
          <select name="motor" defaultValue={p?.motor ?? ""}>
            <option value="">Ainda não sei</option>
            {(Object.keys(MOTORES) as Motor[]).map((m) => <option key={m} value={m}>{m} · {MOTORES[m]}</option>)}
          </select>
        </div>
      </div>
      <p className="ajuda">Cada pessoa liga um motor diferente. O líder precisa saber qual é o de cada um.</p>
    </>
  );
}
