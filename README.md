# 🗂️ PDF Tools — Imágenes a PDF y Eliminar Páginas Online

**Free PDF Tools.** Convert JPG, PNG, WebP, GIF and BMP images to PDF with fit/fill/original modes, and remove specific pages from any existing PDF. No sign-up, no ads, 100% client-side.

🌐 **Demo en vivo / Live demo:** [miguelacm.es/tools/pdf-tools](https://miguelacm.es/tools/pdf-tools)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

- 🖼️ **Imágenes → PDF / Images → PDF:** convierte JPG, PNG, WebP, GIF y BMP en un PDF multipágina / convert JPG, PNG, WebP, GIF and BMP into a multi-page PDF
- 📐 **Tres modos de ajuste / Three fit modes:** Ajustar (fit), Rellenar (fill) y Original size para controlar cómo se escala cada imagen / Fit, Fill and Original to control how each image is scaled
- 📄 **A4 y Letter / A4 and Letter:** orientación vertical u horizontal con márgenes configurables / portrait or landscape with configurable margins
- 🔄 **Reordenar / Reorder:** drag & drop para cambiar el orden de las páginas antes de generar el PDF / drag & drop to change page order before generating the PDF
- ✂️ **Eliminar páginas / Remove pages:** selecciona visualmente qué páginas borrar de cualquier PDF existente / visually select which pages to delete from any existing PDF
- ⚡ **Procesamiento instantáneo / Instant processing:** sin espera de servidor, todo ocurre en el navegador / no server wait, everything happens in the browser
- 🔒 **Privacidad total / Full privacy:** ningún archivo sale de tu dispositivo / no file leaves your device
- 📦 **Embebible / Embeddable:** iframe listo para cualquier web / iframe ready for any website

---

## 🚀 Quick start

```bash
git clone https://github.com/m-a-c-m/PDFTools.git
cd PDFTools
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables (optional)

```env
NEXT_PUBLIC_SITE_URL=https://miguelacm.es/tools/pdf-tools
NEXT_PUBLIC_EMBED_URL=https://miguelacm.es/embed/pdf-tools
```

---

## 📦 Embed on your website

### Iframe (plug & play)

```html
<iframe
  src="https://miguelacm.es/embed/pdf-tools"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;"
  title="PDF Tools — miguelacm.es"
  loading="lazy"
></iframe>
```

### Link with attribution (recommended for backlink)

```html
<a href="https://miguelacm.es/tools/pdf-tools" target="_blank" rel="noopener">
  Herramientas PDF gratis por MACM
</a>
```

> 💡 The link option generates a real backlink that benefits the project. Recommended if your platform supports custom HTML.

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | React framework + SSG |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling |
| [jsPDF](https://github.com/parallax/jsPDF) | 4 | Images → PDF generation |
| [pdf-lib](https://pdf-lib.js.org) | 1.17 | PDF page removal |
| [react-icons](https://react-icons.github.io/react-icons/) | 5 | Icons |

---

## 📄 License

MIT © [Miguel Ángel Colorado Marin (MACM)](https://miguelacm.es)

Built with ❤️ by **[MACM](https://miguelacm.es)** — Full Stack Developer & Cybersecurity Specialist from Guadalajara, Spain.

- 🌐 Portfolio: [miguelacm.es](https://miguelacm.es)
- 💼 LinkedIn: [linkedin.com/in/macm](https://www.linkedin.com/in/macm/)
- 🐙 GitHub: [github.com/m-a-c-m](https://github.com/m-a-c-m)
