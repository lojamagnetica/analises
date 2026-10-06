import type { Portal } from "@/lib/contexto";

export function CamposPortal({ p }: { p?: Partial<Portal> }) {
  return (
    <>
      <label className="rotulo">Nome da loja</label>
      <input type="text" name="loja" required defaultValue={p?.loja ?? ""} />
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Responsável</label><input type="text" name="responsavel" defaultValue={p?.responsavel ?? ""} /></div>
        <div><label className="rotulo">E-mail</label><input type="email" name="email" defaultValue={p?.email ?? ""} /></div>
        <div><label className="rotulo">WhatsApp</label><input type="text" name="whatsapp" defaultValue={p?.whatsapp ?? ""} /></div>
        <div>
          <label className="rotulo">Tipo</label>
          <select name="tipo" defaultValue={p?.tipo ?? "Mentoria"}>
            <option>Mentoria</option><option>Mentoria VIP Anual</option><option>Consultoria</option>
          </select>
        </div>
        <div><label className="rotulo">Início</label><input type="date" name="inicio" defaultValue={p?.inicio ?? ""} /></div>
        <div><label className="rotulo">Link fixo do Meet</label><input type="url" name="meet_url" defaultValue={p?.meet_url ?? ""} placeholder="https://meet.google.com/…" /></div>
      </div>
      <label className="rotulo">Apelidos na agenda</label>
      <input type="text" name="apelidos" defaultValue={(p?.apelidos ?? []).join(", ")} placeholder="Ex.: Shiê, Shie" />
      <div className="ajuda">Nomes que aparecem no título dos eventos do Google Agenda, separados por vírgula. O nome da loja já conta.</div>
    </>
  );
}
