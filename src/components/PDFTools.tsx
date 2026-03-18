"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  FiUpload,
  FiDownload,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { MdPictureAsPdf, MdImage } from "react-icons/md";

interface Props {
  locale?: string;
}

type Tab = "images-to-pdf" | "remove-pages";
type FitMode = "fit" | "fill" | "original";
type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";
type Margin = "none" | "small" | "normal";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export default function PDFTools({ locale = "es" }: Props) {
  const isEs = locale === "es";

  const [tab, setTab] = useState<Tab>("images-to-pdf");

  // ── Tab 1: Images → PDF ──────────────────────────────────────────────────
  const [images, setImages] = useState<ImageItem[]>([]);
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<Margin>("normal");
  const [generating, setGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewUrlRef = useRef<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // ── Tab 2: Remove pages ──────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false);
  const thumbnailRenderIdRef = useRef(0);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
    };
  }, []);

  const setPreviewUrl = (url: string | null) => {
    if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
    pdfPreviewUrlRef.current = url;
    setPdfPreviewUrl(url);
  };

  // ── Image loading ────────────────────────────────────────────────────────

  const loadImages = useCallback((files: FileList | File[]) => {
    setPreviewUrl(null);
    const accepted = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    const newItems: ImageItem[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages((prev) => [...prev, ...newItems]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeImage = useCallback((id: string) => {
    setPreviewUrl(null);
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveImage = useCallback((idx: number, dir: -1 | 1) => {
    setPreviewUrl(null);
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag reorder ─────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return;
    setPreviewUrl(null);
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Generate PDF from images ─────────────────────────────────────────────

  const generatePdf = useCallback(async () => {
    if (!images.length) return;
    setGenerating(true);
    setPreviewUrl(null);
    let doc: InstanceType<Awaited<typeof import("jspdf")>["jsPDF"]> | null = null;
    try {
      const { jsPDF } = await import("jspdf");
      const marginMm = margin === "none" ? 0 : margin === "small" ? 10 : 20;
      doc = new jsPDF({ orientation, unit: "mm", format: pageSize });

      for (let i = 0; i < images.length; i++) {
        // Yield to UI thread so the browser doesn't freeze with many images
        await new Promise<void>((r) => setTimeout(r, 0));
        if (i > 0) doc.addPage(pageSize, orientation);

        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(images[i].file);
        });

        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = dataUrl;
        });
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        const mime = images[i].file.type;
        let fmt: "JPEG" | "PNG" | "WEBP" = "PNG";
        if (mime === "image/jpeg") fmt = "JPEG";
        else if (mime === "image/webp") fmt = "WEBP";

        let finalUrl = dataUrl;
        if (mime === "image/gif" || mime === "image/bmp") {
          const canvas = document.createElement("canvas");
          canvas.width = iw;
          canvas.height = ih;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          finalUrl = canvas.toDataURL("image/png");
          fmt = "PNG";
        }

        const areaW = pw - 2 * marginMm;
        const areaH = ph - 2 * marginMm;
        let dx: number, dy: number, dw: number, dh: number;

        if (fitMode === "fit") {
          const scale = Math.min(areaW / iw, areaH / ih);
          dw = iw * scale;
          dh = ih * scale;
          dx = marginMm + (areaW - dw) / 2;
          dy = marginMm + (areaH - dh) / 2;
        } else if (fitMode === "fill") {
          const scale = Math.max(pw / iw, ph / ih);
          dw = iw * scale;
          dh = ih * scale;
          dx = (pw - dw) / 2;
          dy = (ph - dh) / 2;
        } else {
          dw = iw * 0.2646;
          dh = ih * 0.2646;
          dx = (pw - dw) / 2;
          dy = (ph - dh) / 2;
        }

        doc.addImage(finalUrl, fmt, dx, dy, dw, dh);
      }

      // Try preview; fall back to direct download if blob URL fails
      try {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch {
        doc.save("images.pdf");
      }
    } catch (err) {
      console.error(err);
      // Last-resort: direct download if doc was partially built
      try { doc?.save("images.pdf"); } catch { /* nothing */ }
    } finally {
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, fitMode, pageSize, orientation, margin]);

  const downloadGeneratedPdf = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement("a");
    a.href = pdfPreviewUrl;
    a.download = "images.pdf";
    a.click();
  };

  // ── Load PDF for page removal ────────────────────────────────────────────

  const loadPdf = useCallback(async (file: File) => {
    setPdfError(null);
    setPageThumbnails([]);
    setThumbnailsLoading(false);
    const myRenderId = ++thumbnailRenderIdRef.current;

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setPageCount(count);
      setPdfFile(file);
      setSelectedPages(new Set());

      // Render thumbnails (non-blocking)
      setThumbnailsLoading(true);
      (async () => {
        try {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const bytes2 = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: bytes2 }).promise;
          const maxPages = Math.min(count, 60);
          const thumbs: string[] = [];
          for (let i = 1; i <= maxPages; i++) {
            if (thumbnailRenderIdRef.current !== myRenderId) return; // stale
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.4 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            thumbs.push(canvas.toDataURL("image/jpeg", 0.75));
            if (i % 6 === 0) setPageThumbnails([...thumbs]);
          }
          if (thumbnailRenderIdRef.current === myRenderId) {
            setPageThumbnails([...thumbs]);
          }
        } catch (err) {
          console.warn("Thumbnail render failed:", err);
        } finally {
          if (thumbnailRenderIdRef.current === myRenderId) {
            setThumbnailsLoading(false);
          }
        }
      })();
    } catch {
      setPdfError(
        isEs
          ? "No se pudo leer el PDF. Puede estar protegido con contraseña o estar dañado."
          : "Could not read the PDF. It may be password-protected or corrupted."
      );
    }
  }, [isEs]);

  const togglePage = (idx: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPages.size === pageCount) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
    }
  };

  const removePages = useCallback(async () => {
    if (!pdfFile || !selectedPages.size) return;
    if (selectedPages.size >= pageCount) {
      setPdfError(
        isEs
          ? "No puedes eliminar todas las páginas."
          : "You cannot remove all pages."
      );
      return;
    }
    setRemoving(true);
    setPdfError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await pdfFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const keepIndices = Array.from({ length: pageCount }, (_, i) => i).filter(
        (i) => !selectedPages.has(i)
      );
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, keepIndices);
      pages.forEach((p) => newDoc.addPage(p));
      const outBytes = await newDoc.save();
      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFile.name.replace(/\.pdf$/i, "") + "_modified.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setPdfError(
        isEs ? "Error al procesar el PDF." : "Error processing the PDF."
      );
    } finally {
      setRemoving(false);
    }
  }, [pdfFile, selectedPages, pageCount, isEs]);

  const resetPdf = () => {
    thumbnailRenderIdRef.current++;
    setPdfFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setPdfError(null);
    setPageThumbnails([]);
    setThumbnailsLoading(false);
  };

  // ── Clipboard paste (Tab 1 only) ─────────────────────────────────────────

  useEffect(() => {
    if (tab !== "images-to-pdf") return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter(Boolean) as File[];
      if (files.length) loadImages(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [tab, loadImages]);

  // ── Drop zone helpers ────────────────────────────────────────────────────

  const handleImgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    loadImages(e.dataTransfer.files);
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") loadPdf(file);
  };

  const remainingPages = pageCount - selectedPages.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Tab selector */}
      <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-sm w-fit">
        <button
          onClick={() => setTab("images-to-pdf")}
          className={`flex items-center gap-2 px-4 py-2 transition-colors ${
            tab === "images-to-pdf"
              ? "bg-primary/20 text-primary"
              : "bg-surface/60 text-text-muted hover:text-text"
          }`}
        >
          <MdImage className="text-base" />
          {isEs ? "Imágenes → PDF" : "Images → PDF"}
        </button>
        <button
          onClick={() => setTab("remove-pages")}
          className={`flex items-center gap-2 px-4 py-2 transition-colors ${
            tab === "remove-pages"
              ? "bg-primary/20 text-primary"
              : "bg-surface/60 text-text-muted hover:text-text"
          }`}
        >
          <MdPictureAsPdf className="text-base" />
          {isEs ? "Eliminar páginas" : "Remove pages"}
        </button>
      </div>

      {/* ── TAB 1: Images → PDF ───────────────────────────────────────────── */}
      {tab === "images-to-pdf" && (
        <div className="flex flex-col gap-4">
          {/* Upload zone */}
          <div
            onDrop={handleImgDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => imgInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 bg-surface/20 p-8 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <FiUpload className="text-3xl text-text-muted/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-text-muted">
                {isEs
                  ? "Arrastra imágenes aquí, haz clic o pega con Ctrl+V"
                  : "Drag images here, click or paste with Ctrl+V"}
              </p>
              <p className="mt-1 text-xs text-text-muted/50">
                JPG, PNG, WebP, GIF, BMP
              </p>
            </div>
          </div>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) loadImages(e.target.files);
              e.target.value = "";
            }}
          />

          {/* Options */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Fit mode */}
            <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-xs">
              {(["fit", "fill", "original"] as FitMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setFitMode(m); setPreviewUrl(null); }}
                  className={`px-3 py-1.5 transition-colors capitalize ${
                    fitMode === m
                      ? "bg-primary/20 text-primary"
                      : "bg-surface/60 text-text-muted hover:text-text"
                  }`}
                >
                  {m === "fit"
                    ? isEs ? "Ajustar" : "Fit"
                    : m === "fill"
                    ? isEs ? "Rellenar" : "Fill"
                    : "Original"}
                </button>
              ))}
            </div>

            {/* Page size */}
            <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-xs">
              {(["a4", "letter"] as PageSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPreviewUrl(null); }}
                  className={`px-3 py-1.5 transition-colors uppercase ${
                    pageSize === s
                      ? "bg-primary/20 text-primary"
                      : "bg-surface/60 text-text-muted hover:text-text"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Orientation */}
            <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-xs">
              {(["portrait", "landscape"] as Orientation[]).map((o) => (
                <button
                  key={o}
                  onClick={() => { setOrientation(o); setPreviewUrl(null); }}
                  className={`px-3 py-1.5 transition-colors ${
                    orientation === o
                      ? "bg-primary/20 text-primary"
                      : "bg-surface/60 text-text-muted hover:text-text"
                  }`}
                >
                  {o === "portrait"
                    ? isEs ? "Vertical" : "Portrait"
                    : isEs ? "Horizontal" : "Landscape"}
                </button>
              ))}
            </div>

            {/* Margin */}
            <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-xs">
              {(["none", "small", "normal"] as Margin[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMargin(m); setPreviewUrl(null); }}
                  className={`px-3 py-1.5 transition-colors ${
                    margin === m
                      ? "bg-primary/20 text-primary"
                      : "bg-surface/60 text-text-muted hover:text-text"
                  }`}
                >
                  {m === "none"
                    ? isEs ? "Sin margen" : "No margin"
                    : m === "small"
                    ? isEs ? "Margen S" : "Small"
                    : isEs ? "Margen M" : "Normal"}
                </button>
              ))}
            </div>

            {images.length > 0 && (
              <button
                onClick={() => { setImages([]); setPreviewUrl(null); }}
                className="ml-auto flex items-center gap-1 rounded-lg border border-border/40 bg-surface/60 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                <FiTrash2 className="text-xs" />
                {isEs ? "Limpiar" : "Clear all"}
              </button>
            )}
          </div>

          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(idx, e)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative cursor-grab rounded-xl border transition-all active:cursor-grabbing ${
                    dragOverIndex === idx && dragIndex !== idx
                      ? "border-primary scale-105"
                      : "border-border/30"
                  } bg-surface/40 overflow-hidden`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col justify-between p-1.5 opacity-0 transition-opacity group-hover:opacity-100 bg-black/40">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        className="rounded bg-black/60 p-1 text-white/80 hover:text-white disabled:opacity-30"
                      >
                        <FiChevronUp className="text-xs" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        className="rounded bg-black/60 p-1 text-white/80 hover:text-white disabled:opacity-30"
                      >
                        <FiChevronDown className="text-xs" />
                      </button>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="rounded bg-black/60 p-1 text-red-400 hover:text-red-300"
                      >
                        <FiX className="text-xs" />
                      </button>
                    </div>
                    <span className="truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
                      {idx + 1}. {img.name}
                    </span>
                  </div>
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:opacity-0 transition-opacity">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stats + generate */}
          {images.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted/70">
                <span>
                  <span className="text-primary font-medium">{images.length}</span>{" "}
                  {isEs ? "imágenes" : "images"}
                </span>
                <span>
                  <span className="text-primary font-medium">{images.length}</span>{" "}
                  {isEs ? "páginas en el PDF" : "pages in PDF"}
                </span>
                <span className="text-text-muted/40">
                  {isEs
                    ? "Arrastra las tarjetas para reordenar"
                    : "Drag cards to reorder"}
                </span>
              </div>
              <button
                onClick={generatePdf}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pdfPreviewUrl ? (
                  <FiRefreshCw className={generating ? "animate-spin" : ""} />
                ) : (
                  <FiDownload />
                )}
                {generating
                  ? isEs ? "Generando…" : "Generating…"
                  : pdfPreviewUrl
                  ? isEs ? "Regenerar PDF" : "Regenerate PDF"
                  : isEs ? "Generar PDF" : "Generate PDF"}
              </button>
            </div>
          )}

          {/* PDF Preview */}
          {pdfPreviewUrl && (
            <div className="rounded-xl border border-border/30 bg-surface/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                <span className="text-sm font-medium text-text-muted">
                  {isEs ? "Vista previa" : "Preview"}
                </span>
                <button
                  onClick={downloadGeneratedPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                >
                  <FiDownload className="text-xs" />
                  {isEs ? "Descargar PDF" : "Download PDF"}
                </button>
              </div>
              <iframe
                src={pdfPreviewUrl}
                title={isEs ? "Vista previa del PDF" : "PDF Preview"}
                className="w-full"
                style={{ height: "520px", border: "none" }}
              />
            </div>
          )}

          {images.length === 0 && (
            <p className="text-center text-sm text-text-muted/40">
              {isEs
                ? "Sube imágenes para empezar. Puedes reordenarlas antes de generar el PDF."
                : "Upload images to start. You can reorder them before generating the PDF."}
            </p>
          )}
        </div>
      )}

      {/* ── TAB 2: Remove pages ───────────────────────────────────────────── */}
      {tab === "remove-pages" && (
        <div className="flex flex-col gap-4">
          {/* Upload zone */}
          {!pdfFile ? (
            <div
              onDrop={handlePdfDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => pdfInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 bg-surface/20 p-10 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <MdPictureAsPdf className="text-4xl text-text-muted/60" />
              <div className="text-center">
                <p className="text-sm font-medium text-text-muted">
                  {isEs
                    ? "Arrastra tu PDF aquí o haz clic para seleccionarlo"
                    : "Drag your PDF here or click to select it"}
                </p>
                <p className="mt-1 text-xs text-text-muted/50">PDF</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-surface/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <MdPictureAsPdf className="text-2xl text-primary" />
                <div>
                  <p className="text-sm font-medium text-text">{pdfFile.name}</p>
                  <p className="text-xs text-text-muted/60">
                    {pageCount} {isEs ? "páginas" : "pages"} ·{" "}
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    {thumbnailsLoading && (
                      <span className="ml-2 text-primary/60">
                        {isEs ? "· Cargando vistas previas…" : "· Loading previews…"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={resetPdf}
                className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                {isEs ? "Cambiar" : "Change"}
              </button>
            </div>
          )}

          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadPdf(file);
              e.target.value = "";
            }}
          />

          {/* Error */}
          {pdfError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              ⚠ {pdfError}
            </div>
          )}

          {/* Page cards */}
          {pdfFile && pageCount > 0 && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-text-muted">
                  {isEs
                    ? `Selecciona las páginas que quieres eliminar (${selectedPages.size} seleccionadas)`
                    : `Select the pages you want to remove (${selectedPages.size} selected)`}
                </p>
                <button
                  onClick={toggleAll}
                  className="rounded-lg border border-border/40 bg-surface/60 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-text"
                >
                  {selectedPages.size === pageCount
                    ? isEs ? "Deseleccionar todo" : "Deselect all"
                    : isEs ? "Seleccionar todo" : "Select all"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {Array.from({ length: pageCount }, (_, i) => {
                  const thumb = pageThumbnails[i];
                  const isSelected = selectedPages.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePage(i)}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 overflow-hidden transition-all ${
                        isSelected
                          ? "border-red-500/60"
                          : "border-border/30 hover:border-primary/40"
                      }`}
                    >
                      {/* Thumbnail or skeleton */}
                      <div className="relative w-full aspect-[3/4] bg-surface/60">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={`Page ${i + 1}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {thumbnailsLoading ? (
                              <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                            ) : (
                              <MdPictureAsPdf className="text-2xl text-text-muted/40" />
                            )}
                          </div>
                        )}
                        {/* Selected overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/40">
                            <FiX className="text-2xl text-white drop-shadow" />
                          </div>
                        )}
                        {/* Page number badge */}
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                      </div>
                      {/* Label */}
                      <span className={`pb-1.5 text-[11px] font-semibold leading-none ${
                        isSelected ? "text-red-400" : "text-text-muted"
                      }`}>
                        {isSelected
                          ? isEs ? "Eliminar" : "Remove"
                          : `${isEs ? "Pág." : "P."} ${i + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stats + action */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted/70">
                  <span>
                    <span className="text-primary font-medium">{pageCount}</span>{" "}
                    {isEs ? "páginas totales" : "total pages"}
                  </span>
                  <span>
                    <span className="text-red-400 font-medium">{selectedPages.size}</span>{" "}
                    {isEs ? "a eliminar" : "to remove"}
                  </span>
                  <span>
                    <span className="text-green-400 font-medium">{remainingPages}</span>{" "}
                    {isEs ? "quedarán" : "will remain"}
                  </span>
                </div>
                <button
                  onClick={removePages}
                  disabled={removing || selectedPages.size === 0 || remainingPages === 0}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <FiDownload />
                  {removing
                    ? isEs ? "Procesando…" : "Processing…"
                    : isEs ? "Descargar PDF modificado" : "Download modified PDF"}
                </button>
              </div>
            </>
          )}

          {!pdfFile && !pdfError && (
            <p className="text-center text-sm text-text-muted/40">
              {isEs
                ? "Sube un PDF para ver sus páginas y seleccionar cuáles eliminar."
                : "Upload a PDF to see its pages and select which ones to remove."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
