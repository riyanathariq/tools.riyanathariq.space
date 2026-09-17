import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import JSZip from "jszip";

import { downloadBlob } from "@/lib/utils";

let workerReady = false;

export function ensurePdfjsWorker() {
  if (workerReady || typeof window === "undefined") return;
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerReady = true;
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export async function loadPdfJsDoc(data: Uint8Array): Promise<PDFDocumentProxy> {
  ensurePdfjsWorker();
  return pdfjs.getDocument({ data: data.slice() }).promise;
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const bytes = await readFileBytes(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** Parse "1-3,5,8-10" (1-based, inclusive) into 0-based unique sorted indices. */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const set = new Set<number>();
  const parts = input.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) continue;
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a > b) [a, b] = [b, a];
    for (let i = a; i <= b; i++) {
      if (i >= 1 && i <= pageCount) set.add(i - 1);
    }
  }
  return [...set].sort((x, y) => x - y);
}

export async function extractPages(file: File, indices: number[]): Promise<Uint8Array> {
  const bytes = await readFileBytes(file);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

export async function splitEveryPage(file: File): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await readFileBytes(file);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const base = file.name.replace(/\.pdf$/i, "") || "page";
  const results: { name: string; bytes: Uint8Array }[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({
      name: `${base}-p${String(i + 1).padStart(2, "0")}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}

export type OrganizeOp = {
  /** original 0-based page index */
  sourceIndex: number;
  rotation: 0 | 90 | 180 | 270;
};

export async function organizePdf(file: File, ops: OrganizeOp[]): Promise<Uint8Array> {
  const bytes = await readFileBytes(file);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  for (const op of ops) {
    const [page] = await out.copyPages(src, [op.sourceIndex]);
    if (op.rotation) page.setRotation(degrees(op.rotation));
    out.addPage(page);
  }
  return out.save();
}

export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageNumber1Based: number,
  maxWidth = 140,
): Promise<string> {
  const page = await doc.getPage(pageNumber1Based);
  const viewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / viewport.width;
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function fileToEmbeddable(
  out: PDFDocument,
  file: File,
): Promise<Awaited<ReturnType<PDFDocument["embedJpg"]>>> {
  const type = file.type || "";
  const name = file.name.toLowerCase();
  const bytes = await readFileBytes(file);
  const isPng = type === "image/png" || name.endsWith(".png");
  const isJpg =
    type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/i.test(name);

  if (isPng) return out.embedPng(bytes);
  if (isJpg) return out.embedJpg(bytes);

  // WebP / other browser-decodable formats → JPEG via canvas
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Unsupported image: ${file.name}`));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.92,
      );
    });
    return out.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imagesToPdf(
  files: File[],
  opts: { page: "fit" | "a4" | "letter"; landscape: boolean },
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const file of files) {
    const image = await fileToEmbeddable(out, file);
    const imgW = image.width;
    const imgH = image.height;

    let pageW: number;
    let pageH: number;
    if (opts.page === "fit") {
      pageW = imgW;
      pageH = imgH;
    } else {
      const a4 = { w: 595.28, h: 841.89 };
      const letter = { w: 612, h: 792 };
      const base = opts.page === "a4" ? a4 : letter;
      pageW = opts.landscape ? base.h : base.w;
      pageH = opts.landscape ? base.w : base.h;
    }

    const page = out.addPage([pageW, pageH]);
    const margin = opts.page === "fit" ? 0 : 36;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / imgW, maxH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    page.drawImage(image, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }
  return out.save();
}

export async function pdfPagesToImages(
  file: File,
  opts: { format: "png" | "jpeg"; scale: number; quality: number },
): Promise<{ name: string; blob: Blob }[]> {
  const bytes = await readFileBytes(file);
  const doc = await loadPdfJsDoc(bytes);
  const base = file.name.replace(/\.pdf$/i, "") || "page";
  const out: { name: string; blob: Blob }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const mime = opts.format === "png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        mime,
        opts.quality,
      );
    });
    out.push({
      name: `${base}-p${String(i).padStart(2, "0")}.${opts.format === "png" ? "png" : "jpg"}`,
      blob,
    });
  }
  return out;
}

export async function compressPdf(
  file: File,
  opts: { scale: number; quality: number },
): Promise<{ bytes: Uint8Array; pages: number }> {
  const bytes = await readFileBytes(file);
  const src = await loadPdfJsDoc(bytes);
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const vp = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    // White background (JPEG has no alpha)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        opts.quality,
      );
    });
    const imgBytes = new Uint8Array(await jpeg.arrayBuffer());
    const image = await out.embedJpg(imgBytes);
    const pdfPage = out.addPage([image.width, image.height]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  // Tiny footer note so empty edge cases still produce a valid doc
  if (src.numPages === 0) {
    const font = await out.embedFont(StandardFonts.Helvetica);
    const p = out.addPage([400, 200]);
    p.drawText("Empty PDF", { x: 40, y: 100, size: 18, font, color: rgb(0.4, 0.4, 0.4) });
  }

  return { bytes: await out.save({ useObjectStreams: true }), pages: src.numPages };
}

export async function zipBlobs(
  entries: { name: string; data: Blob | Uint8Array }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.name, e.data);
  }
  return zip.generateAsync({ type: "blob" });
}

export function downloadPdf(filename: string, bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(filename, new Blob([copy], { type: "application/pdf" }));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
