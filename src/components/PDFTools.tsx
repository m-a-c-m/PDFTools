"use client";

import { useState, useRef, useCallback } from "react";
import {
  FiUpload,
  FiDownload,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiX,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // ── Tab 2: Remove pages ──────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ── Image loading ────────────────────────────────────────────────────────

  const loadImages = useCallback((files: FileList | File[]) => {
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
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const moveImage = useCallback((idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // ── Drag reorder ─────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return;
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
    try {
      const { jsPDF } = await import("jspdf");
      const marginMm = margin === "none" ? 0 : margin === "small" ? 10 : 20;
      const doc = new jsPDF({ orientation, unit: "mm", format: pageSize });

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage(pageSize, orientation);

        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        // Read as dataUrl for jsPDF
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(images[i].file);
        });

        // Get actual image dimensions
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = dataUrl;
        });
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // Determine format
        const mime = images[i].file.type;
        let fmt: "JPEG" | "PNG" | "WEBP" = "PNG";
        if (mime === "image/jpeg") fmt = "JPEG";
        else if (mime === "image/webp") fmt = "WEBP";

        // Convert GIF/BMP to PNG via canvas
        let finalUrl = dataUrl;
        if (mime === "image/gif" || mime === "image/bmp") {
          const canvas = document.createElement("canvas");
          canvas.width = iw;
          canvas.height = ih;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          finalUrl = canvas.toDataURL("image/png");
          fmt = "PNG";
        }

        // Calculate draw rect
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
          // original — px to mm at 96dpi
          dw = iw * 0.2646;
          dh = ih * 0.2646;
          dx = (pw - dw) / 2;
          dy = (ph - dh) / 2;
        }

        doc.addImage(finalUrl, fmt, dx, dy, dw, dh);
      }

      doc.save("images.pdf");
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [images, fitMode, pageSize, orientation, margin]);

  // ── Load PDF for page removal ────────────────────────────────────────────

  const loadPdf = useCallback(async (file: File) => {
    setPdfError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
      setPdfFile(file);
      setSelectedPages(new Set());
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
                  ? "Arrastra imágenes aquí o haz clic para seleccionar"
                  : "Drag images here or click to select"}
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
                  onClick={() => setFitMode(m)}
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
                    : isEs ? "Original" : "Original"}
                </button>
              ))}
            </div>

            {/* Page size */}
            <div className="flex items-center rounded-lg border border-border/40 overflow-hidden text-xs">
              {(["a4", "letter"] as PageSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setPageSize(s)}
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
                  onClick={() => setOrientation(o)}
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
                  onClick={() => setMargin(m)}
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
                onClick={() => setImages([])}
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
                  {/* Preview */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="aspect-square w-full object-cover"
                  />
                  {/* Overlay */}
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
                  {/* Page number badge */}
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
                <FiDownload />
                {generating
                  ? isEs ? "Generando…" : "Generating…"
                  : isEs ? "Descargar PDF" : "Download PDF"}
              </button>
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
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setPageCount(0);
                  setSelectedPages(new Set());
                  setPdfError(null);
                }}
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

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => togglePage(i)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                      selectedPages.has(i)
                        ? "border-red-500/60 bg-red-500/10 text-red-400"
                        : "border-border/30 bg-surface/40 text-text-muted hover:border-primary/40"
                    }`}
                  >
                    <MdPictureAsPdf className="text-xl" />
                    <span className="text-[11px] font-semibold leading-none">
                      {i + 1}
                    </span>
                    {selectedPages.has(i) && (
                      <span className="text-[9px] leading-none">
                        {isEs ? "Eliminar" : "Remove"}
                      </span>
                    )}
                  </button>
                ))}
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
