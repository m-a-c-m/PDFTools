import PDFTools from "@/components/PDFTools";
import { MdPictureAsPdf } from "react-icons/md";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://miguelacm.es/tools/pdf-tools";
const EMBED_URL =
  process.env.NEXT_PUBLIC_EMBED_URL || "https://miguelacm.es/embed/pdf-tools";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Herramientas PDF Online Gratis",
  url: SITE_URL,
  description:
    "Convierte imágenes JPG, PNG y WebP a PDF y elimina páginas de un PDF. Sin registro, sin servidor, 100% en el navegador.",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  inLanguage: "es-ES",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  author: { "@type": "Person", name: "Miguel Ángel Colorado Marin", url: "https://miguelacm.es" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <MdPictureAsPdf className="text-base" />
              Herramienta gratuita · Código abierto
            </div>
            <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">
              Herramientas PDF
            </h1>
            <p className="mb-2 text-lg text-text-muted">
              Convierte imágenes a PDF y elimina páginas de un PDF. Sin registro, sin servidor.
            </p>
            <p className="text-sm text-text-muted/60">
              Hecho por{" "}
              <a href="https://miguelacm.es" target="_blank" rel="noopener noreferrer"
                className="gradient-text font-medium hover:opacity-80 transition-opacity">
                MACM
              </a>{" "}
              · Sin anuncios · 100% en el navegador
            </p>
          </div>

          <div className="glass rounded-2xl border border-border/20 p-6 md:p-8">
            <PDFTools />
          </div>

          <div className="mt-12 glass rounded-2xl border border-border/20 p-8">
            <h2 className="mb-6 text-2xl font-bold text-white">¿Cómo usar las herramientas PDF?</h2>
            <ol className="space-y-5">
              {[
                { n: "1", t: "Selecciona el modo", d: "Usa la pestaña Imágenes → PDF para crear un PDF desde fotos. Usa Eliminar páginas para borrar páginas de un PDF existente. Sin registro ni cuenta." },
                { n: "2", t: "Imágenes a PDF: sube y reordena", d: "Arrastra imágenes JPG, PNG, WebP, GIF o BMP. Reordénalas arrastrando las tarjetas. Cada imagen será una página del PDF." },
                { n: "3", t: "Configura el ajuste y el tamaño", d: "Elige Ajustar, Rellenar u Original. Selecciona A4 o Carta, vertical u horizontal y el margen." },
                { n: "4", t: "Eliminar páginas y descargar", d: "Sube un PDF, haz clic en las páginas a eliminar (se marcan en rojo) y descarga el PDF resultante." },
              ].map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{s.n}</span>
                  <div>
                    <h3 className="mb-1 font-semibold text-white">{s.t}</h3>
                    <p className="text-sm leading-relaxed text-text-muted">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 glass rounded-2xl border border-border/20 p-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Preguntas frecuentes</h2>
            <div className="space-y-6">
              {[
                { q: "¿Qué formatos de imagen soporta?", a: "JPG, PNG, WebP, GIF y BMP. GIF y BMP se convierten a PNG automáticamente. Los GIF animados capturan el primer fotograma." },
                { q: "¿Se pierde calidad al convertir a PDF?", a: "No. La imagen se incrusta con su resolución original. Los modos Ajustar y Rellenar escalan sin recomprimir." },
                { q: "¿Funciona con PDFs protegidos con contraseña?", a: "No. Los PDFs cifrados no pueden procesarse. Primero desbloquéalos con la contraseña en otra aplicación." },
                { q: "¿Hay límite de tamaño de archivo?", a: "No hay límite externo impuesto. El único límite es la RAM de tu dispositivo. Para PDFs muy grandes (más de 500 páginas) puede ser lento." },
                { q: "¿Se envían mis archivos a algún servidor?", a: "No. Todo ocurre en tu navegador. Ningún archivo sale de tu dispositivo en ningún momento." },
              ].map((item) => (
                <div key={item.q}>
                  <h3 className="mb-2 font-semibold text-white">{item.q}</h3>
                  <p className="text-sm leading-relaxed text-text-muted">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 glass rounded-2xl border border-border/20 p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Incrusta en tu web</h2>
            <pre className="overflow-x-auto rounded-lg bg-surface/80 p-4 text-xs text-text-muted">
              <code>{`<iframe\n  src="${EMBED_URL}"\n  width="100%"\n  height="700"\n  style="border:none;border-radius:12px;"\n  title="PDF Tools"\n  loading="lazy"\n></iframe>`}</code>
            </pre>
          </div>
        </div>
      </main>
    </>
  );
}
