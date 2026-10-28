"use client";

// Novidades das lojas: o que as lojas fizeram no Hub (o banco registra sozinho) e os avisos no celular da equipe.
import { BASE } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export type Novidade = { id: number; portal_id: string | null; tipo: string; texto: string; link: string | null; created_at: string };

/** Chave pública dos avisos (a privada fica só no cofre do banco). */
const VAPID_PUBLICA = "BIFeocUPAPkIE8TuZ3lxJXM6Fx3vx3fK-bUi0hd8wjpljJeg8qFhUM-WFmJ8AWZ-FYB5NH2i5RfFga7YmSX9L34";
const VISTO = "lm_novidades_visto";
const sb = () => supabaseBrowser();

export async function buscarNovidades(): Promise<Novidade[]> {
  const { data } = await sb().from("novidades").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as Novidade[];
}

export async function excluirNovidade(id: number) {
  const { error } = await sb().from("novidades").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Quando esta pessoa olhou as novidades pela última vez (neste aparelho). */
export function vistoEm() {
  try { return localStorage.getItem(VISTO) ?? ""; } catch { return ""; }
}
export function marcarVisto() {
  try { localStorage.setItem(VISTO, new Date().toISOString()); } catch { /* sem armazenamento */ }
}

// ───── Avisos no celular ─────

export type SituacaoAvisos = "sem-suporte" | "instalar" | "bloqueado" | "ativo" | "desligado";

const iphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export async function situacaoAvisos(): Promise<SituacaoAvisos> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return iphone() && !instalado() ? "instalar" : "sem-suporte";
  }
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  const ass = await reg?.pushManager.getSubscription();
  return ass && Notification.permission === "granted" ? "ativo" : "desligado";
}

const chaveEmBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Pede a permissão, registra este aparelho e guarda no banco. */
export async function ativarAvisos() {
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Os avisos não foram permitidos neste aparelho.");
  const reg = await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });
  await navigator.serviceWorker.ready;
  const ass = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(VAPID_PUBLICA) }));
  const j = ass.toJSON();
  const { error } = await sb().from("push_assinaturas").upsert({ endpoint: ass.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" }, { onConflict: "endpoint" });
  if (error) throw new Error("Não deu para ligar os avisos. Tente de novo.");
}

export async function desativarAvisos() {
  const reg = await navigator.serviceWorker.getRegistration(`${BASE}/`);
  const ass = await reg?.pushManager.getSubscription();
  if (!ass) return;
  await sb().from("push_assinaturas").delete().eq("endpoint", ass.endpoint);
  await ass.unsubscribe();
}
