"use client";

import {
  Activity,
  Clock3,
  Inbox,
  Plus,
  Radio,
  Trash2,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CloudGate } from "@/components/cloud-gate";
import { useToast } from "@/components/toast";
import {
  ClearButton,
  CopyButton,
  DownloadButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getToolBySlug } from "@/data/tools-registry";
import {
  clearWebhookHits,
  createWebhookBin,
  deleteWebhookBin,
  getWebhookBin,
  getWebhookHit,
  listWebhookBins,
  type WebhookBin,
  type WebhookHit,
  type WebhookHitSummary,
  type WebhookLimits,
} from "@/lib/api";
import { cn, copyText } from "@/lib/utils";

type MobilePane = "list" | "detail";
type DetailTab = "body" | "headers" | "query";

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-success-soft text-success border-success/30",
  POST: "bg-accent-soft text-accent-ink border-accent/40",
  PUT: "bg-premium-soft text-premium-ink border-premium/40",
  PATCH: "bg-accent-soft text-accent-ink border-accent/40",
  DELETE: "bg-danger-soft text-danger-ink border-danger",
  HEAD: "bg-sunken text-ink-muted border-line",
  OPTIONS: "bg-sunken text-ink-muted border-line",
};

function methodClass(method: string) {
  return METHOD_STYLES[method.toUpperCase()] ?? "bg-sunken text-ink-muted border-line";
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
}

function formatExpiresIn(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = t - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.round(diff / 3_600_000);
  if (hours < 48) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
}

function prettyBody(body: string, contentType?: string) {
  const ct = (contentType ?? "").toLowerCase();
  if (!body.trim()) return { text: "", language: "empty" as const };
  if (ct.includes("json") || /^[\[{]/.test(body.trim())) {
    try {
      return { text: JSON.stringify(JSON.parse(body), null, 2), language: "json" as const };
    } catch {
      /* fall through */
    }
  }
  return { text: body, language: "text" as const };
}

function curlSample(url: string) {
  return `curl -i -X POST '${url}' \\
  -H 'Content-Type: application/json' \\
  -d '{"event":"ping","from":"tools.riyanathariq.space"}'`;
}

export function webhookBin() {
  const meta = getToolBySlug("webhook-bin");
  const { toast } = useToast();

  const [bins, setBins] = useState<{ bin: WebhookBin; hookUrl: string }[]>([]);
  const [limits, setLimits] = useState<WebhookLimits | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hookUrl, setHookUrl] = useState("");
  const [hits, setHits] = useState<WebhookHitSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WebhookHit | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(true);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [detailTab, setDetailTab] = useState<DetailTab>("body");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  const activeBin = useMemo(
    () => bins.find((b) => b.bin.id === activeId)?.bin ?? null,
    [bins, activeId],
  );

  const refreshBins = useCallback(async () => {
    const data = await listWebhookBins();
    setBins(data.bins);
    setLimits(data.limits);
    return data.bins;
  }, []);

  const loadBin = useCallback(async (id: string, opts?: { quiet?: boolean }) => {
    const data = await getWebhookBin(id);
    setHookUrl(data.hookUrl);
    setLimits(data.limits);
    setHits((prev) => {
      const prevIds = new Set(prev.map((h) => h.id));
      const fresh = data.hits.filter((h) => !prevIds.has(h.id));
      if (fresh.length > 0) {
        setFlashIds((old) => {
          const next = new Set(old);
          for (const h of fresh) next.add(h.id);
          return next;
        });
        window.setTimeout(() => {
          setFlashIds((old) => {
            const next = new Set(old);
            for (const h of fresh) next.delete(h.id);
            return next;
          });
        }, 1800);
      }
      return data.hits;
    });
    setBins((prev) => {
      const others = prev.filter((b) => b.bin.id !== id);
      return [{ bin: data.bin, hookUrl: data.hookUrl }, ...others].sort(
        (a, b) => +new Date(b.bin.createdAt) - +new Date(a.bin.createdAt),
      );
    });
    if (!opts?.quiet) setError(null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await refreshBins();
        if (cancelled) return;
        if (list.length > 0) {
          const id = list[0].bin.id;
          setActiveId(id);
          await loadBin(id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBins, loadBin]);

  useEffect(() => {
    if (!activeId || !listening) return;
    const id = window.setInterval(() => {
      void loadBin(activeId, { quiet: true }).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [activeId, listening, loadBin]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeId || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getWebhookHit(activeId, selectedId)
      .then((hit) => {
        if (!cancelled) setDetail(hit);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load hit");
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, selectedId]);

  const onCreate = async () => {
    try {
      setCreating(true);
      setError(null);
      const created = await createWebhookBin(name.trim());
      setName("");
      setBins((prev) => [created, ...prev]);
      setLimits(created.limits);
      setActiveId(created.bin.id);
      setHookUrl(created.hookUrl);
      setHits([]);
      setSelectedId(null);
      setDetail(null);
      setMobilePane("list");
      toast("Bin created — endpoint is live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bin");
    } finally {
      setCreating(false);
    }
  };

  const onSelectBin = async (id: string) => {
    setActiveId(id);
    setSelectedId(null);
    setDetail(null);
    setMobilePane("list");
    try {
      await loadBin(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bin");
    }
  };

  const onClear = async () => {
    if (!activeId) return;
    try {
      await clearWebhookHits(activeId);
      setHits([]);
      setSelectedId(null);
      setDetail(null);
      toast("Hits cleared");
      await loadBin(activeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear");
    }
  };

  const onDelete = async () => {
    if (!activeId) return;
    if (!window.confirm("Delete this bin and all captured requests?")) return;
    try {
      await deleteWebhookBin(activeId);
      const next = bins.filter((b) => b.bin.id !== activeId);
      setBins(next);
      setSelectedId(null);
      setDetail(null);
      setHits([]);
      if (next[0]) {
        await onSelectBin(next[0].bin.id);
      } else {
        setActiveId(null);
        setHookUrl("");
      }
      toast("Bin deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const pretty = useMemo(
    () => prettyBody(detail?.body ?? "", detail?.contentType),
    [detail],
  );

  void tick; // keep relative timestamps fresh

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Webhook Bin"}
        description={
          meta?.description ??
          "Unique URL that captures inbound HTTP requests for debugging."
        }
        slug="webhook-bin"
      />
      <CloudGate toolName="Webhook Bin">
        <div className="flex flex-col gap-3">
          {error ? (
            <div className="rounded-2xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-ink">
              {error}
            </div>
          ) : null}

          <Panel
            title="Your bins"
            actions={
              limits ? (
                <span className="text-[11px] text-ink-faint">
                  {bins.length}/{limits.maxBinsPerUser} · {limits.ttlHours}h TTL
                </span>
              ) : null
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1 text-sm text-ink-muted">
                Name <span className="text-ink-faint">(optional)</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Stripe sandbox, GitHub hooks…"
                  maxLength={64}
                />
              </label>
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                disabled={creating || loading || (limits != null && bins.length >= limits.maxBinsPerUser)}
                onClick={() => void onCreate()}
              >
                <Plus className="size-4" />
                {creating ? "Creating…" : "Create bin"}
              </Button>
            </div>

            {loading ? (
              <p className="mt-4 animate-pulse text-sm text-ink-faint">Loading bins…</p>
            ) : bins.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-raised px-4 py-8 text-center">
                <Inbox className="mx-auto mb-3 size-8 text-ink-faint" />
                <p className="text-sm font-medium text-ink">No bins yet</p>
                <p className="mt-1 text-sm text-ink-faint">
                  Create one to get a public <span className="font-mono text-ink-muted">/hook/…</span>{" "}
                  URL. Point Stripe, GitHub, or curl at it.
                </p>
              </div>
            ) : (
              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
                {bins.map(({ bin }) => {
                  const active = bin.id === activeId;
                  return (
                    <button
                      key={bin.id}
                      type="button"
                      onClick={() => void onSelectBin(bin.id)}
                      className={cn(
                        "min-w-[10rem] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-success/40 bg-success-soft"
                          : "border-line bg-sunken hover:border-line",
                      )}
                    >
                      <p className="truncate text-sm font-medium text-ink">{bin.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-ink-faint">{bin.id.slice(0, 10)}…</p>
                      <p className="mt-1 text-[11px] text-ink-faint">
                        {bin.hitCount} hit{bin.hitCount === 1 ? "" : "s"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          {activeBin && hookUrl ? (
            <>
              <Panel
                title="Endpoint"
                actions={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setListening((v) => !v)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium",
                        listening
                          ? "bg-success-soft text-success"
                          : "bg-sunken text-ink-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          listening ? "animate-pulse bg-accent" : "bg-line-strong",
                        )}
                      />
                      {listening ? "Live" : "Paused"}
                    </button>
                    <CopyButton value={hookUrl} />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 min-h-9 px-2.5"
                      onClick={async () => {
                        await copyText(curlSample(hookUrl));
                        toast("curl sample copied");
                      }}
                      aria-label="Copy curl"
                    >
                      <Terminal className="size-4" />
                      <span className="sr-only sm:not-sr-only sm:inline">curl</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 min-h-9 px-2.5 text-danger-ink hover:text-danger-ink"
                      onClick={() => void onDelete()}
                      aria-label="Delete bin"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-gradient-to-br from-accent-soft via-surface to-surface p-4">
                    <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success-soft text-success">
                      <Radio className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{activeBin.name}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-muted">
                          <Clock3 className="size-3" />
                          {formatExpiresIn(activeBin.expiresAt)}
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs leading-relaxed text-success sm:text-sm">
                        {hookUrl}
                      </p>
                      <p className="mt-2 text-xs text-ink-faint">
                        Accepts any method. Trailing paths work too — e.g.{" "}
                        <span className="font-mono text-ink-muted">{hookUrl}/events</span>
                      </p>
                    </div>
                  </div>

                  <pre className="overflow-x-auto rounded-xl border border-line bg-raised p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                    {curlSample(hookUrl)}
                  </pre>
                </div>
              </Panel>

              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-sunken p-1 lg:hidden">
                {(
                  [
                    { id: "list", label: "Requests", icon: Activity },
                    { id: "detail", label: "Detail", icon: Inbox },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobilePane(id)}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors",
                      mobilePane === id
                        ? "bg-success-soft text-success"
                        : "text-ink-faint hover:bg-raised hover:text-ink",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                    {id === "list" && hits.length > 0 ? (
                      <span className="rounded-full bg-sunken px-1.5 text-[10px] text-ink-muted">
                        {hits.length}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4">
                <section
                  className={cn(
                    "flex h-[24rem] flex-col overflow-hidden rounded-2xl border border-line bg-sunken sm:h-[28rem]",
                    mobilePane === "list" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-success" />
                      <h2 className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                        Incoming
                      </h2>
                      <span className="text-[11px] text-ink-faint">{hits.length}</span>
                    </div>
                    <ClearButton onClick={() => void onClear()} />
                  </header>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {hits.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                        <div className="relative">
                          <span className="absolute inset-0 animate-ping rounded-full bg-success-soft" />
                          <div className="relative inline-flex size-12 items-center justify-center rounded-full border border-success/30 bg-success-soft text-success">
                            <Radio className="size-5" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">Listening…</p>
                          <p className="mt-1 text-xs text-ink-faint">
                            Send a request to your endpoint. New hits appear here live.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {hits.map((hit) => {
                          const selected = hit.id === selectedId;
                          const flash = flashIds.has(hit.id);
                          return (
                            <li key={hit.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(hit.id);
                                  setDetailTab("body");
                                  setMobilePane("detail");
                                }}
                                className={cn(
                                  "w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                                  selected
                                    ? "border-success/40 bg-success-soft"
                                    : "border-line bg-sunken hover:border-line",
                                  flash && "ring-1 ring-ring/30",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex min-w-[3.25rem] justify-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                                      methodClass(hit.method),
                                    )}
                                  >
                                    {hit.method}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-muted">
                                    {hit.path.replace(/^\/hook\/[a-f0-9]+/, "") || "/"}
                                    {hit.query ? `?${hit.query}` : ""}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-ink-faint">
                                  <span>{formatRelative(hit.receivedAt)}</span>
                                  <span>{formatBytes(hit.bodyBytes)}</span>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section
                  className={cn(
                    "flex h-[24rem] flex-col overflow-hidden rounded-2xl border border-line bg-sunken sm:h-[28rem]",
                    mobilePane === "detail" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                    <h2 className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                      Request detail
                    </h2>
                    {detail ? (
                      <div className="flex items-center gap-1">
                        <CopyButton
                          value={JSON.stringify(detail, null, 2)}
                        />
                        <DownloadButton
                          value={JSON.stringify(detail, null, 2)}
                          filename={`webhook-hit-${detail.id.slice(0, 8)}.json`}
                        />
                      </div>
                    ) : null}
                  </header>

                  {!detail ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-faint">
                      Select a request to inspect headers, query, and body.
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="shrink-0 space-y-2 border-b border-line px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold",
                              methodClass(detail.method),
                            )}
                          >
                            {detail.method}
                          </span>
                          <span className="min-w-0 break-all font-mono text-xs text-ink-muted">
                            {detail.path}
                            {detail.query ? `?${detail.query}` : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                          <span>{new Date(detail.receivedAt).toLocaleString()}</span>
                          <span>{detail.ip}</span>
                          <span>{formatBytes(detail.bodyBytes)}</span>
                          {detail.contentType ? <span className="truncate">{detail.contentType}</span> : null}
                          {detail.bodyTruncated ? (
                            <span className="text-premium-ink">body truncated</span>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-raised p-1">
                          {(
                            [
                              { id: "body", label: "Body" },
                              { id: "headers", label: "Headers" },
                              { id: "query", label: "Query" },
                            ] as const
                          ).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setDetailTab(t.id)}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                                detailTab === t.id
                                  ? "bg-sunken text-ink"
                                  : "text-ink-faint hover:text-ink-muted",
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-auto p-3">
                        {detailTab === "body" ? (
                          pretty.language === "empty" ? (
                            <p className="text-sm text-ink-faint">Empty body</p>
                          ) : (
                            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink-muted sm:text-xs">
                              {pretty.text}
                            </pre>
                          )
                        ) : null}

                        {detailTab === "headers" ? (
                          <dl className="space-y-2">
                            {Object.entries(detail.headers)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([k, v]) => (
                                <div
                                  key={k}
                                  className="rounded-xl border border-line bg-raised px-3 py-2"
                                >
                                  <dt className="font-mono text-[11px] text-success">{k}</dt>
                                  <dd className="mt-1 break-all font-mono text-[11px] text-ink-muted">
                                    {v}
                                  </dd>
                                </div>
                              ))}
                          </dl>
                        ) : null}

                        {detailTab === "query" ? (
                          Object.keys(detail.queryParams ?? {}).length === 0 ? (
                            <p className="text-sm text-ink-faint">No query parameters</p>
                          ) : (
                            <dl className="space-y-2">
                              {Object.entries(detail.queryParams ?? {}).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="rounded-xl border border-line bg-raised px-3 py-2"
                                >
                                  <dt className="font-mono text-[11px] text-success">{k}</dt>
                                  <dd className="mt-1 break-all font-mono text-[11px] text-ink-muted">
                                    {v}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )
                        ) : null}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </div>
      </CloudGate>
    </>
  );
}
