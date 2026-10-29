"use client";

// Acessos da empresa (comuns a toda a equipe). A senha não fica na tabela: vai criptografada para o cofre do Supabase
// e só é lida quando alguém da equipe clica em "Ver senha".
import { supabaseBrowser } from "@/lib/supabase/client";

export type Acesso = { id: string; ferramenta: string; link: string; login: string; segredo: string | null; obs: string; updated_at: string };

const sb = () => supabaseBrowser();
const ok = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) throw new Error(error.message); };

export async function listarAcessos(): Promise<Acesso[]> {
  const { data, error } = await sb().from("acessos").select("*").order("ferramenta");
  if (error) throw new Error(error.message);
  return (data ?? []) as Acesso[];
}
export async function salvarAcesso(a: Partial<Acesso> & { ferramenta: string }, senha?: string) {
  const dados = { ferramenta: a.ferramenta.trim(), link: (a.link ?? "").trim(), login: (a.login ?? "").trim(), obs: a.obs ?? "", updated_at: new Date().toISOString() };
  let id = a.id;
  if (id) await ok(sb().from("acessos").update(dados).eq("id", id));
  else {
    const { data, error } = await sb().from("acessos").insert(dados).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id as string;
  }
  if (senha !== undefined) await ok(sb().rpc("acesso_guardar_senha", { p_id: id, p_senha: senha }));
}
export const excluirAcesso = (id: string) => ok(sb().from("acessos").delete().eq("id", id));
export async function verSenha(id: string): Promise<string> {
  const { data, error } = await sb().rpc("acesso_senha", { p_id: id });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? "";
}
