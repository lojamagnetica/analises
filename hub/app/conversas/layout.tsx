import type { Metadata } from "next";
import { BASE } from "@/lib/config";

// O app do celular só das Conversas da equipe: tem o próprio ícone e abre direto no chat, em tela cheia.
export const metadata: Metadata = {
  title: "Conversas",
  manifest: `${BASE}/manifest-conversas.webmanifest`,
  icons: {
    icon: [{ url: `${BASE}/icon-conversas-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE}/apple-touch-icon-conversas.png`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { title: "Conversas", capable: true, statusBarStyle: "black" },
  robots: { index: false, follow: false },
};

export default function LayoutConversas({ children }: { children: React.ReactNode }) {
  return children;
}
