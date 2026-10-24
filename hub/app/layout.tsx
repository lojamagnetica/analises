import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BASE } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "magnética.hub", template: "%s · magnética.hub" },
  description: "Hub da Loja Magnética: o portal da loja e da equipe.",
  manifest: `${BASE}/manifest.webmanifest`,
  // O iPhone não usa SVG como ícone da tela inicial: precisa de PNG quadrado, sem cantos transparentes.
  icons: {
    icon: [{ url: `${BASE}/icon.svg`, type: "image/svg+xml" }, { url: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { title: "magnética.hub" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#141210", width: "device-width", initialScale: 1 };

// Aplica tema e tamanho de letra salvos antes de pintar a tela (evita piscar).
const preferencias = `try{var r=document.documentElement,t=localStorage.getItem('lm_tema'),l=localStorage.getItem('lm_largo'),f=localStorage.getItem('lm_fs');if(t)r.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)r.dataset.theme='dark';if(l)r.dataset.largo=l;if(f)r.style.setProperty('--fs',f)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,800&family=Outfit:wght@400;500&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: preferencias }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
