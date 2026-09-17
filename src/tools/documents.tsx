"use client";

import {
  ArrowDown,
  ArrowUp,
  FileUp,
  Loader2,
  RotateCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import {
  compressPdf,
  downloadPdf,
  extractPages,
  formatBytes,
  imagesToPdf as buildImagesPdf,
  loadPdfJsDoc,
  mergePdfs,
  organizePdf,
  parsePageRanges,
  pdfPagesToImages,
  readFileBytes,
  renderPageThumbnail,
  splitEveryPage,
  zipBlobs,
  type OrganizeOp,
} from "@/lib/pdf";
import { cn, downloadBlob } from "@/lib/utils";

function PdfDropzone({
  multiple,
  onFiles,
  label = "Drop PDFs here or click to browse",
}: {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const pdfs = [...list].filter(
        (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name),
      );
      if (pdfs.length) onFiles(pdfs);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
        dragOver
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50",
      )}
    >
      <Upload className="size-8 text-zinc-500" />
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="text-xs text-zinc-500">PDF only · processed locally</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ImageDropzone({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const imgs = [...list].filter((f) => f.type.startsWith("image/"));
      if (imgs.length) onFiles(imgs);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
        dragOver
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50",
      )}
    >
      <FileUp className="size-8 text-zinc-500" />
      <p className="text-sm text-zinc-300">Drop images here or click to browse</p>
      <p className="text-xs text-zinc-500">JPG · PNG · WebP · local only</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function BusyButton({
  busy,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button disabled={busy || props.disabled} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      {message}
    </p>
  );
}

/* ─── Merge ─────────────────────────────────────────────── */

export function pdfMerge() {
  const meta = getToolBySlug("pdf-merge");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (incoming: File[]) => {
    setError(null);
    setFiles((prev) => [...prev, ...incoming]);
  };

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const run = async () => {
    if (files.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await mergePdfs(files);
      downloadPdf("merged.pdf", bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "PDF Merge"}
        description={meta?.description ?? ""}
        slug="pdf-merge"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Files">
          <div className="space-y-3">
            <PdfDropzone multiple onFiles={add} label="Drop PDFs to merge" />
            {files.length ? (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                      {f.name}
                      <span className="ml-2 text-xs text-zinc-500">{formatBytes(f.size)}</span>
                    </span>
                    <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, 1)} aria-label="Move down">
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={busy} onClick={() => void run()}>
                Merge & download
              </BusyButton>
              <ClearButton onClick={() => { setFiles([]); setError(null); }} />
            </div>
            <ErrorLine message={error} />
          </div>
        </Panel>
        <Panel title="Notes">
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>· Order in the list is the order in the merged file.</li>
            <li>· Encrypted PDFs may fail unless the viewer can ignore encryption.</li>
            <li>· Everything runs in your browser — nothing is uploaded.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ─── Split ─────────────────────────────────────────────── */

export function pdfSplit() {
  const meta = getToolBySlug("pdf-split");
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [range, setRange] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPageCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bytes = await readFileBytes(file);
        const doc = await loadPdfJsDoc(bytes);
        if (!cancelled) {
          setPageCount(doc.numPages);
          setRange(doc.numPages > 1 ? `1-${doc.numPages}` : "1");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to read PDF");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const runRange = async () => {
    if (!file || !pageCount) return;
    const indices = parsePageRanges(range, pageCount);
    if (!indices.length) {
      setError("No valid pages in range.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await extractPages(file, indices);
      downloadPdf(`${file.name.replace(/\.pdf$/i, "")}-extract.pdf`, bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setBusy(false);
    }
  };

  const runEvery = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const parts = await splitEveryPage(file);
      const zip = await zipBlobs(parts.map((p) => ({ name: p.name, data: p.bytes })));
      downloadBlob(`${file.name.replace(/\.pdf$/i, "")}-pages.zip`, zip);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "PDF Split"}
        description={meta?.description ?? ""}
        slug="pdf-split"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Source">
          <div className="space-y-3">
            <PdfDropzone
              onFiles={(fs) => {
                setFile(fs[0] ?? null);
                setError(null);
              }}
              label={file ? "Replace PDF" : "Drop a PDF to split"}
            />
            {file ? (
              <p className="text-sm text-zinc-300">
                {file.name} · {formatBytes(file.size)}
                {pageCount ? ` · ${pageCount} pages` : ""}
              </p>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Page range
              </span>
              <Input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="1-3,5,8-10"
                disabled={!file}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={busy} disabled={!file} onClick={() => void runRange()}>
                Extract range
              </BusyButton>
              <BusyButton
                busy={busy}
                disabled={!file}
                variant="outline"
                onClick={() => void runEvery()}
              >
                Split every page (ZIP)
              </BusyButton>
              <ClearButton
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
              />
            </div>
            <ErrorLine message={error} />
          </div>
        </Panel>
        <Panel title="Examples">
          <ul className="space-y-2 font-mono text-sm text-zinc-400">
            <li>1-5 → pages 1 through 5</li>
            <li>1,3,7 → pages 1, 3, and 7</li>
            <li>2-4,8-10 → ranges combined</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ─── Organize ──────────────────────────────────────────── */

type OrgPage = OrganizeOp & { thumb?: string };

export function pdfOrganize() {
  const meta = getToolBySlug("pdf-organize");
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<OrgPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: File) => {
    setLoading(true);
    setError(null);
    setFile(f);
    try {
      const bytes = await readFileBytes(f);
      const doc = await loadPdfJsDoc(bytes);
      const next: OrgPage[] = [];
      for (let i = 0; i < doc.numPages; i++) {
        const thumb = await renderPageThumbnail(doc, i + 1, 120);
        next.push({ sourceIndex: i, rotation: 0, thumb });
      }
      setPages(next);
    } catch (e) {
      setFile(null);
      setPages([]);
      setError(e instanceof Error ? e.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    setPages((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const rotate = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, rotation: ((p.rotation + 90) % 360) as OrgPage["rotation"] }
          : p,
      ),
    );
  };

  const remove = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const run = async () => {
    if (!file || !pages.length) {
      setError("Need at least one page.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await organizePdf(
        file,
        pages.map(({ sourceIndex, rotation }) => ({ sourceIndex, rotation })),
      );
      downloadPdf(`${file.name.replace(/\.pdf$/i, "")}-organized.pdf`, bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Organize failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "PDF Organize"}
        description={meta?.description ?? ""}
        slug="pdf-organize"
      />
      <div className="space-y-4">
        <Panel
          title="Pages"
          actions={
            <div className="flex gap-2">
              <BusyButton busy={busy || loading} disabled={!pages.length} onClick={() => void run()}>
                Download
              </BusyButton>
              <ClearButton
                onClick={() => {
                  setFile(null);
                  setPages([]);
                  setError(null);
                }}
              />
            </div>
          }
        >
          <div className="space-y-3">
            {!file ? (
              <PdfDropzone onFiles={(fs) => void load(fs[0]!)} label="Drop a PDF to organize" />
            ) : null}
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="size-4 animate-spin" /> Rendering thumbnails…
              </p>
            ) : null}
            {pages.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pages.map((p, i) => (
                  <li
                    key={`${p.sourceIndex}-${i}`}
                    className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="flex aspect-[3/4] items-center justify-center bg-zinc-950 p-2">
                      {p.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumb}
                          alt={`Page ${p.sourceIndex + 1}`}
                          className="max-h-full max-w-full object-contain"
                          style={{ transform: `rotate(${p.rotation}deg)` }}
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-1 border-t border-zinc-800 px-2 py-1.5">
                      <span className="font-mono text-[11px] text-zinc-500">
                        p{p.sourceIndex + 1}
                        {p.rotation ? ` · ${p.rotation}°` : ""}
                      </span>
                      <div className="flex">
                        <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, -1)} aria-label="Move earlier">
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, 1)} aria-label="Move later">
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-800" onClick={() => rotate(i)} aria-label="Rotate">
                          <RotateCw className="size-3.5" />
                        </button>
                        <button type="button" className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300" onClick={() => remove(i)} aria-label="Delete page">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <ErrorLine message={error} />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─── Images → PDF ──────────────────────────────────────── */

export function imagesToPdf() {
  const meta = getToolBySlug("images-to-pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [page, setPage] = useState<"fit" | "a4" | "letter">("fit");
  const [landscape, setLandscape] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const run = async () => {
    if (!files.length) {
      setError("Add at least one image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await buildImagesPdf(files, { page, landscape });
      downloadPdf("images.pdf", bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Images to PDF"}
        description={meta?.description ?? ""}
        slug="images-to-pdf"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Images">
          <div className="space-y-3">
            <ImageDropzone onFiles={(incoming) => setFiles((prev) => [...prev, ...incoming])} />
            {files.length ? (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[i]?.url} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{f.name}</span>
                    <button type="button" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800" onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Panel>
        <Panel title="Options">
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Page size</span>
              <select
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                value={page}
                onChange={(e) => setPage(e.target.value as typeof page)}
              >
                <option value="fit">Fit to image</option>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={landscape}
                onChange={(e) => setLandscape(e.target.checked)}
                disabled={page === "fit"}
              />
              Landscape (A4 / Letter)
            </label>
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={busy} onClick={() => void run()}>
                Build PDF
              </BusyButton>
              <ClearButton onClick={() => { setFiles([]); setError(null); }} />
            </div>
            <ErrorLine message={error} />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─── PDF → Images ──────────────────────────────────────── */

export function pdfToImages() {
  const meta = getToolBySlug("pdf-to-images");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const images = await pdfPagesToImages(file, {
        format,
        scale,
        quality: 0.92,
      });
      if (images.length === 1) {
        downloadBlob(images[0].name, images[0].blob);
      } else {
        const zip = await zipBlobs(images.map((img) => ({ name: img.name, data: img.blob })));
        downloadBlob(`${file.name.replace(/\.pdf$/i, "")}-images.zip`, zip);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "PDF to Images"}
        description={meta?.description ?? ""}
        slug="pdf-to-images"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Source">
          <div className="space-y-3">
            <PdfDropzone
              onFiles={(fs) => {
                setFile(fs[0] ?? null);
                setError(null);
              }}
              label={file ? "Replace PDF" : "Drop a PDF"}
            />
            {file ? (
              <p className="text-sm text-zinc-300">
                {file.name} · {formatBytes(file.size)}
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Export">
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Format</span>
              <select
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Scale ({scale}×)
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={busy} disabled={!file} onClick={() => void run()}>
                Render & download
              </BusyButton>
              <ClearButton onClick={() => { setFile(null); setError(null); }} />
            </div>
            <ErrorLine message={error} />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─── Compress ──────────────────────────────────────────── */

export function pdfCompress() {
  const meta = getToolBySlug("pdf-compress");
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<"light" | "medium" | "strong">("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: number; after: number } | null>(null);

  const presets = {
    light: { scale: 1.5, quality: 0.85 },
    medium: { scale: 1.25, quality: 0.72 },
    strong: { scale: 1, quality: 0.55 },
  } as const;

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { bytes } = await compressPdf(file, presets[preset]);
      setResult({ before: file.size, after: bytes.byteLength });
      downloadPdf(`${file.name.replace(/\.pdf$/i, "")}-compressed.pdf`, bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compress failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "PDF Compress"}
        description={meta?.description ?? ""}
        slug="pdf-compress"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Source">
          <div className="space-y-3">
            <PdfDropzone
              onFiles={(fs) => {
                setFile(fs[0] ?? null);
                setResult(null);
                setError(null);
              }}
              label={file ? "Replace PDF" : "Drop a PDF to compress"}
            />
            {file ? (
              <p className="text-sm text-zinc-300">
                {file.name} · {formatBytes(file.size)}
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Quality">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["light", "medium", "strong"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs capitalize",
                    preset === p
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Re-renders each page as JPEG. Best for photo/scan PDFs. Pure text PDFs may not shrink
              much (or can grow).
            </p>
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={busy} disabled={!file} onClick={() => void run()}>
                Compress & download
              </BusyButton>
              <ClearButton
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                }}
              />
            </div>
            {result ? (
              <p className="font-mono text-sm text-emerald-300/90">
                {formatBytes(result.before)} → {formatBytes(result.after)} (
                {result.after < result.before
                  ? `−${Math.round((1 - result.after / result.before) * 100)}%`
                  : `+${Math.round((result.after / result.before - 1) * 100)}%`}
                )
              </p>
            ) : null}
            <ErrorLine message={error} />
          </div>
        </Panel>
      </div>
    </>
  );
}
