import type { Metadata } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://miguelacm.es/tools/pdf-tools";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Herramientas PDF Online Gratis — Imágenes a PDF y Eliminar Páginas",
    template: "%s | PDF Tools",
  },
  description:
    "Convierte imágenes JPG, PNG y WebP a PDF y elimina páginas de un PDF. Sin registro, sin servidor, 100% en el navegador. Por MACM.",
  keywords: [
    "images to pdf",
    "imágenes a pdf",
    "jpg to pdf",
    "png to pdf",
    "pdf tools online",
    "remove pdf pages",
    "eliminar páginas pdf",
    "delete pdf pages online",
    "herramientas pdf gratis",
    "convertir imágenes a pdf",
  ],
  authors: [{ name: "Miguel Ángel Colorado Marin", url: "https://miguelacm.es" }],
  creator: "Miguel Ángel Colorado Marin",
  openGraph: {
    title: "Herramientas PDF Online Gratis",
    description:
      "Convierte imágenes a PDF y elimina páginas de un PDF. Sin registro. Por MACM.",
    url: SITE_URL,
    siteName: "PDF Tools — MACM",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Herramientas PDF Online Gratis",
    description: "Imágenes a PDF y eliminar páginas. Sin registro. Por MACM · miguelacm.es",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="author" href="https://miguelacm.es" />
        <meta name="author" content="Miguel Ángel Colorado Marin" />
        <meta name="copyright" content="Miguel Ángel Colorado Marin — miguelacm.es" />
      </head>
      <body className="antialiased">
        {children}
        <footer className="pb-8 text-center text-xs text-text-muted/40">
          ⚡ por{" "}
          <a
            href="https://miguelacm.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted/60 transition-colors hover:text-text-muted underline-offset-2 hover:underline"
          >
            MACM · miguelacm.es
          </a>
          {" · "}
          <a
            href="https://github.com/m-a-c-m/PDFTools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted/60 transition-colors hover:text-text-muted underline-offset-2 hover:underline"
          >
            Código abierto
          </a>
        </footer>
      </body>
    </html>
  );
}
