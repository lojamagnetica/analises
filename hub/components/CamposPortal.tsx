import type { Portal } from "@/lib/hub";

export function CamposPortal({ p }: { p?: Partial<Portal> }) {
  return (
    <>
      <label className="rotulo">Nome da loja</label>
      <input type="text" name="loja" required defaultValue={p?.loja ?? ""} />
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Responsável</label><input type="text" name="responsavel" defaultValue={p?.responsavel ?? ""} /></div>
        <div><label className="rotulo">E-mail</label><input type="email" name="email" defaultValue={p?.email ?? ""} /></div>
        <div><label className="rotulo">WhatsApp</label><input type="text" name="whatsapp" defaultValue={p?.whatsapp ?? ""} /></div>
        <div><label className="rotulo">Aniversário da responsável</label><input type="date" name="aniversario" defaultValue={p?.aniversario ?? ""} /></div>
        <div>
          <label className="rotulo">Tipo</label>
          <select name="tipo" defaultValue={p?.tipo ?? "Mentoria"}>
            <option>Mentoria</option><option>Mentoria VIP Anual</option><option>Consultoria</option><option value="Curso">Curso (só a área de membros)</option>
          </select>
        </div>
        <div><label className="rotulo">Início</label><input type="date" name="inicio" defaultValue={p?.inicio ?? ""} /></div>
        <div>
          <label className="rotulo">Início do plano de ação</label>
          <input type="date" name="plano_inicio" defaultValue={p?.plano_inicio ?? ""} />
          <div className="ajuda">As datas dos meses 1, 2 e 3 do plano saem daqui. Dia 1 vira meses do calendário (01/11 a 30/11). Vazio usa o início da loja.</div>
        </div>
        <div><label className="rotulo">Link fixo do Meet</label><input type="url" name="meet_url" defaultValue={p?.meet_url ?? ""} placeholder="https://meet.google.com/…" /></div>
      </div>
      <label className="rotulo">Apelidos na agenda</label>
      <input type="text" name="apelidos" defaultValue={(p?.apelidos ?? []).join(", ")} placeholder="Ex.: Shiê, Shie" />
      <div className="ajuda">Nomes que aparecem no título dos eventos do Google Agenda, separados por vírgula. O nome da loja já conta.</div>
      <label className="rotulo">Lojas deste portal</label>
      <input type="text" name="lojas" defaultValue={(p?.lojas ?? []).join(", ")} placeholder="Ex.: Loja Feminina, Loja Masculina" />
      <div className="ajuda">Só quando o portal tem mais de uma loja (ex.: feminino e masculino), separadas por vírgula. Com uma loja só, deixe em branco.</div>
    </>
  );
}
