import { MOTORES, type Metodo, type Motor } from "@/lib/pessoas";

export function CamposPessoa({ p, m }: { p?: { nome: string; funcao: string | null; entrada: string | null; motor: Motor | null }; m: Metodo }) {
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
            {MOTORES.map((x) => <option key={x} value={x}>{x} · {m.motores[x]}</option>)}
          </select>
        </div>
      </div>
      <p className="ajuda">{m.textos.motor_ajuda}</p>
    </>
  );
}
