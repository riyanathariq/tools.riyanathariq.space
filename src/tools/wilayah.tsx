"use client";

import { Check, ChevronDown, Loader2, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  Panel,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import {
  WILAYAH_BASE,
  districtsUrl,
  filterByQuery,
  getAllRegencies,
  getDistricts,
  getProvinces,
  getRegencies,
  getSubdistricts,
  normalizeKode,
  provincesUrl,
  regenciesUrl,
  resolveKode,
  subdistrictsUrl,
  type WilayahDistrict,
  type WilayahProvince,
  type WilayahRegency,
  type WilayahResolved,
  type WilayahSubdistrict,
} from "@/lib/wilayah";
import { cn, copyText } from "@/lib/utils";

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-rose-400">{message}</p>;
}

type ComboItem = { id: number; value: string; hint?: string };

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
};

function SearchCombobox({
  label,
  items,
  value,
  onChange,
  locked,
  loading,
  placeholder,
  emptyHint,
  onOpen,
}: {
  label: string;
  items: ComboItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  locked?: boolean;
  loading?: boolean;
  placeholder: string;
  emptyHint?: string;
  onOpen?: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const selected = items.find((i) => i.id === value) ?? null;
  const filtered = useMemo(() => filterByQuery(items, query), [items, query]);

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const viewportPad = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const preferBottom = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const available = preferBottom ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(160, Math.min(320, available - gap));
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight,
      placement: preferBottom ? "bottom" : "top",
      top: preferBottom
        ? rect.bottom + gap
        : Math.max(viewportPad, rect.top - gap - maxHeight),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onWin = () => updatePos();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const pick = (id: number) => {
    onChange(id);
    setOpen(false);
  };

  const clear = () => {
    if (locked) return;
    onChange(null);
    setQuery("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) pick(item.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const menu =
    open && !locked && pos
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 80,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-lg shadow-black/50"
          >
            <div className="shrink-0 border-b border-zinc-800 p-2">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-9 font-sans"
                aria-controls={listId}
                aria-autocomplete="list"
                role="combobox"
                aria-expanded
              />
            </div>
            <ul
              id={listId}
              role="listbox"
              className="min-h-0 flex-1 overflow-auto py-1"
              style={{ maxHeight: Math.max(80, pos.maxHeight - 52) }}
            >
              {loading ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500">Loading…</li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500">
                  {items.length === 0 ? emptyHint ?? "No options yet" : "No matches"}
                </li>
              ) : (
                filtered.map((item, idx) => {
                  const active = item.id === value;
                  const hi = idx === highlight;
                  return (
                    <li key={item.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                          hi ? "bg-zinc-800/80" : "hover:bg-zinc-900",
                          active && "text-emerald-300",
                        )}
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => pick(item.id)}
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-100">
                          {item.value}
                          {item.hint ? (
                            <span className="ml-1 text-zinc-500">{item.hint}</span>
                          ) : null}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">{item.id}</span>
                        {active ? <Check className="size-3.5 text-emerald-400" /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="shrink-0 border-t border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">
              {filtered.length}
              {query ? ` / ${items.length}` : ""} · ↑↓ Enter Esc
              {pos.placement === "top" ? " · opens up" : ""}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative block space-y-1.5">
      <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
        {locked ? (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] tracking-normal text-zinc-400 normal-case">
            locked
          </span>
        ) : null}
        {loading ? <Loader2 className="size-3.5 animate-spin text-zinc-400" /> : null}
      </span>

      <button
        ref={triggerRef}
        type="button"
        disabled={loading && items.length === 0}
        onClick={() => {
          if (locked) return;
          setOpen((o) => {
            const next = !o;
            if (next) onOpen?.();
            return next;
          });
        }}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left text-sm transition-colors",
          locked
            ? "cursor-default border-zinc-800/80 bg-zinc-900/60 text-zinc-300"
            : "hover:border-zinc-600",
          open && !locked && "border-emerald-500/40 ring-2 ring-emerald-500/15",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-zinc-100" : "text-zinc-500")}>
          {selected ? (
            <>
              {selected.value}{" "}
              <span className="font-mono text-zinc-500">({selected.id})</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        {selected && !locked ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`Clear ${label}`}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              clear();
            }}
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <ChevronDown className={cn("size-4 shrink-0 text-zinc-500", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}

function ResultCard({
  title,
  kode,
  path,
  json,
  apiUrl,
  postal,
}: {
  title: string;
  kode: string;
  path: string[];
  json: unknown;
  apiUrl: string;
  postal?: string;
}) {
  const { toast } = useToast();
  const pathText = path.join(" › ");
  const jsonText = JSON.stringify(json, null, 2);

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await copyText(value);
    toast(`${label} copied`);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{title}</p>
        <p className="mt-1 font-mono text-lg text-zinc-100">{kode || "—"}</p>
        <p className="mt-1 text-sm text-zinc-300">{pathText || "Select a region"}</p>
        {postal ? (
          <p className="mt-1 text-sm text-zinc-400">
            Kode pos: <span className="font-mono text-zinc-200">{postal}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" variant="ghost" className="h-9 min-h-9 px-2.5" disabled={!kode} onClick={() => void copy("Kode", kode)}>
          Copy kode
        </Button>
        <Button type="button" variant="ghost" className="h-9 min-h-9 px-2.5" disabled={!pathText} onClick={() => void copy("Path", pathText)}>
          Copy path
        </Button>
        <Button type="button" variant="ghost" className="h-9 min-h-9 px-2.5" disabled={!json || jsonText === "null"} onClick={() => void copy("JSON", jsonText)}>
          Copy JSON
        </Button>
        <Button type="button" variant="ghost" className="h-9 min-h-9 px-2.5" disabled={!apiUrl} onClick={() => void copy("API URL", apiUrl)}>
          Copy API URL
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
        {jsonText}
      </pre>
      {apiUrl ? <p className="break-all font-mono text-[11px] text-zinc-500">{apiUrl}</p> : null}
    </div>
  );
}

/* ─── Explorer ──────────────────────────────────────────── */

export function wilayahExplorer() {
  const meta = getToolBySlug("wilayah-explorer");
  const [provinces, setProvinces] = useState<WilayahProvince[]>([]);
  const [regencies, setRegencies] = useState<WilayahRegency[]>([]);
  const [districts, setDistricts] = useState<WilayahDistrict[]>([]);
  const [villages, setVillages] = useState<WilayahSubdistrict[]>([]);

  const [provId, setProvId] = useState<number | null>(null);
  const [regId, setRegId] = useState<number | null>(null);
  const [distId, setDistId] = useState<number | null>(null);
  const [vilId, setVilId] = useState<number | null>(null);

  const [lockProv, setLockProv] = useState(false);
  const [lockReg, setLockReg] = useState(false);
  const [lockDist, setLockDist] = useState(false);

  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingReg, setLoadingReg] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingVil, setLoadingVil] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRegsCache, setAllRegsCache] = useState<WilayahRegency[] | null>(null);

  // Provinces only on boot (light).
  useEffect(() => {
    let cancelled = false;
    setLoadingProv(true);
    getProvinces()
      .then((prov) => {
        if (cancelled) return;
        setProvinces(prov.slice().sort((a, b) => a.value.localeCompare(b.value, "id")));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load provinces");
      })
      .finally(() => setLoadingProv(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Regencies: scoped to province when set; otherwise use full cache for kab-first.
  useEffect(() => {
    let cancelled = false;

    if (provId == null) {
      if (allRegsCache) {
        setRegencies(allRegsCache);
        setLoadingReg(false);
        return;
      }
      // Keep empty until user opens Kab (ensureAllRegencies) or picks province.
      setRegencies([]);
      setLoadingReg(false);
      return;
    }

    setLoadingReg(true);
    getRegencies(provId)
      .then((data) => {
        if (!cancelled) {
          setRegencies(data.slice().sort((a, b) => a.value.localeCompare(b.value, "id")));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load kab/kota");
      })
      .finally(() => setLoadingReg(false));

    return () => {
      cancelled = true;
    };
  }, [provId, allRegsCache]);

  useEffect(() => {
    let cancelled = false;

    if (provId == null || regId == null) {
      setDistricts([]);
      setLoadingDist(false);
      return;
    }

    setLoadingDist(true);
    getDistricts(provId, regId)
      .then((data) => {
        if (!cancelled) setDistricts(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load kecamatan");
      })
      .finally(() => setLoadingDist(false));

    return () => {
      cancelled = true;
    };
  }, [provId, regId]);

  useEffect(() => {
    let cancelled = false;

    if (provId == null || regId == null || distId == null) {
      setVillages([]);
      setLoadingVil(false);
      return;
    }

    setLoadingVil(true);
    getSubdistricts(provId, regId, distId)
      .then((data) => {
        if (!cancelled) setVillages(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load desa/kelurahan");
      })
      .finally(() => setLoadingVil(false));

    return () => {
      cancelled = true;
    };
  }, [provId, regId, distId]);

  const ensureAllRegencies = async () => {
    if (allRegsCache || loadingReg) return;
    setLoadingReg(true);
    try {
      const all = await getAllRegencies();
      setAllRegsCache(all);
      if (provId == null) setRegencies(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load kab/kota");
    } finally {
      setLoadingReg(false);
    }
  };

  const province = provinces.find((p) => p.id === provId);
  const regency =
    regencies.find((r) => r.id === regId) ??
    allRegsCache?.find((r) => r.id === regId);
  const district = districts.find((d) => d.id === distId);
  const village = villages.find((v) => v.id === vilId);

  const onProvince = (id: number | null) => {
    setLoadingDist(false);
    setLoadingVil(false);
    setProvId(id);
    setLockProv(false);
    setRegId(null);
    setDistId(null);
    setVilId(null);
    setDistricts([]);
    setVillages([]);
    setLockReg(false);
    setLockDist(false);
  };

  const onRegency = (id: number | null) => {
    setLoadingDist(false);
    setLoadingVil(false);
    if (id == null) {
      setRegId(null);
      setLockProv(false);
      setDistId(null);
      setVilId(null);
      setDistricts([]);
      setVillages([]);
      setLockReg(false);
      setLockDist(false);
      return;
    }
    const reg =
      regencies.find((r) => r.id === id) ??
      allRegsCache?.find((r) => r.id === id);
    if (!reg) return;
    setRegId(id);
    setProvId(reg.province_id);
    setLockProv(true);
    setDistId(null);
    setVilId(null);
    setDistricts([]);
    setVillages([]);
    setLockReg(false);
    setLockDist(false);
  };

  const onDistrict = (id: number | null) => {
    setLoadingVil(false);
    if (id == null) {
      setDistId(null);
      setVilId(null);
      setVillages([]);
      setLockReg(false);
      setLockDist(false);
      return;
    }
    const dist = districts.find((d) => d.id === id);
    if (!dist) return;
    setDistId(id);
    setProvId(dist.province_id);
    setRegId(dist.regency_id);
    setLockProv(true);
    setLockReg(true);
    setVilId(null);
    setVillages([]);
    setLockDist(false);
  };

  const onVillage = (id: number | null) => {
    if (id == null) {
      setVilId(null);
      setLockDist(false);
      return;
    }
    const vil = villages.find((v) => v.id === id);
    if (!vil) return;
    setVilId(id);
    setProvId(vil.province_id);
    setRegId(vil.regency_id);
    setDistId(vil.district_id);
    setLockProv(true);
    setLockReg(true);
    setLockDist(true);
  };

  const path = [
    province?.value,
    regency?.value,
    district?.value,
    village?.value,
  ].filter(Boolean) as string[];

  const kode =
    village?.id?.toString() ??
    district?.id?.toString() ??
    regency?.id?.toString() ??
    province?.id?.toString() ??
    "";

  const payload = village ?? district ?? regency ?? province ?? null;
  const apiUrl = village
    ? subdistrictsUrl(provId!, regId!, distId!)
    : district
      ? districtsUrl(provId!, regId!)
      : regency
        ? regenciesUrl(provId!)
        : province
          ? provincesUrl()
          : "";

  const clear = () => {
    setLoadingDist(false);
    setLoadingVil(false);
    setProvId(null);
    setRegId(null);
    setDistId(null);
    setVilId(null);
    setDistricts([]);
    setVillages([]);
    setLockProv(false);
    setLockReg(false);
    setLockDist(false);
    setError(null);
    if (allRegsCache) setRegencies(allRegsCache);
    else setRegencies([]);
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Wilayah Explorer"}
        description={meta?.description ?? ""}
        slug="wilayah-explorer"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cascade">
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Search inside each dropdown. Start from Kab/Kota — Provinsi locks from{" "}
              <code className="text-zinc-400">province_id</code>.
            </p>
            <SearchCombobox
              label="Provinsi"
              items={provinces}
              value={provId}
              onChange={onProvince}
              locked={lockProv}
              loading={loadingProv}
              placeholder="Select or search province"
            />
            <SearchCombobox
              label="Kabupaten / Kota"
              items={regencies}
              value={regId}
              onChange={onRegency}
              locked={lockReg}
              loading={loadingReg}
              placeholder={provId ? "Select kab/kota" : "Search any kab/kota (locks province)"}
              emptyHint={provId ? "No kab/kota" : "Open to load all kab/kota…"}
              onOpen={provId == null ? () => void ensureAllRegencies() : undefined}
            />
            <SearchCombobox
              label="Kecamatan"
              items={districts}
              value={distId}
              onChange={onDistrict}
              locked={lockDist}
              loading={loadingDist}
              placeholder={regId ? "Select or search kecamatan" : "Pick kab/kota first"}
              emptyHint={regId ? "No kecamatan" : "Pick kab/kota first"}
            />
            <SearchCombobox
              label="Desa / Kelurahan"
              items={villages.map((v) => ({
                id: v.id,
                value: v.value,
                hint: v.postal_code ? `· ${v.postal_code}` : undefined,
              }))}
              value={vilId}
              onChange={onVillage}
              loading={loadingVil}
              placeholder={distId ? "Select or search desa/kelurahan" : "Pick kecamatan first"}
              emptyHint={distId ? "No desa/kelurahan" : "Pick kecamatan first"}
            />
            <div className="flex flex-wrap gap-2">
              <ClearButton onClick={clear} />
            </div>
            <ErrorLine message={error} />
            <p className="text-xs text-zinc-500">
              Data from{" "}
              <a
                className="text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-white"
                href="https://github.com/riyanathariq/wilayah-indonesia"
                target="_blank"
                rel="noreferrer"
              >
                wilayah-indonesia
              </a>
              . See{" "}
              <a className="text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-white" href="/t/wilayah-api">
                API Docs
              </a>{" "}
              for integration.
            </p>
          </div>
        </Panel>
        <Panel title="Selection">
          <ResultCard
            title="Current selection"
            kode={kode}
            path={path}
            json={payload}
            apiUrl={apiUrl}
            postal={village?.postal_code}
          />
        </Panel>
      </div>
    </>
  );
}

/* ─── Lookup ────────────────────────────────────────────── */

export function wilayahLookup() {
  const meta = getToolBySlug("wilayah-lookup");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WilayahResolved | null>(null);

  const run = async (value?: string) => {
    const kode = normalizeKode(value ?? input);
    if (!kode) {
      setError("Enter a kode wilayah.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resolved = await resolveKode(kode);
      setResult(resolved);
      setInput(kode);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  };

  const payload = result
    ? {
        kode: result.kode,
        level: result.level,
        province: result.province,
        regency: result.regency,
        district: result.district,
        village: result.village,
        path: result.path,
      }
    : null;

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Wilayah Lookup"}
        description={meta?.description ?? ""}
        slug="wilayah-lookup"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Kode">
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Kode wilayah
              </span>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. 32 · 3201 · 320101 · 3201012002"
                className="font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void run();
                }}
              />
            </label>
            <p className="text-xs text-zinc-500">
              Accepts 2 (provinsi), 4 (kab/kota), 6 (kecamatan), or 10 (desa/kelurahan) digits.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void run()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Resolve
              </Button>
              <Button type="button" variant="ghost" className="h-9" onClick={() => void run("3201011007")}>
                Sample
              </Button>
              <ClearButton
                onClick={() => {
                  setInput("");
                  setResult(null);
                  setError(null);
                }}
              />
            </div>
            <ErrorLine message={error} />
          </div>
        </Panel>
        <Panel title="Resolved">
          {result ? (
            <ResultCard
              title={`Level: ${result.level}`}
              kode={result.kode}
              path={result.path}
              json={payload}
              apiUrl={result.apiUrl}
              postal={result.village?.postal_code}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              Paste a kode and hit Resolve. Hierarchy is fetched lazily from the static API.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ─── API Docs ──────────────────────────────────────────── */

const SAMPLE_PROVINCE = `[
  { "id": 32, "value": "Jawa Barat" }
]`;

const SAMPLE_REGENCY = `[
  {
    "id": 3201,
    "province_id": 32,
    "type": "Kabupaten",
    "value": "Bogor"
  }
]`;

const SAMPLE_DISTRICT = `[
  {
    "id": 320101,
    "province_id": 32,
    "regency_id": 3201,
    "value": "Cibinong"
  }
]`;

const SAMPLE_VILLAGE = `[
  {
    "id": 3201011007,
    "province_id": 32,
    "regency_id": 3201,
    "district_id": 320101,
    "value": "Pakansari",
    "postal_code": "16915"
  }
]`;

export function wilayahApi() {
  const meta = getToolBySlug("wilayah-api");
  const { toast } = useToast();
  const [prov, setProv] = useState("32");
  const [kab, setKab] = useState("3201");
  const [kec, setKec] = useState("320101");

  const urls = {
    provinces: provincesUrl(),
    regencies: regenciesUrl(Number(prov) || 0),
    districts: districtsUrl(Number(prov) || 0, Number(kab) || 0),
    villages: subdistrictsUrl(Number(prov) || 0, Number(kab) || 0, Number(kec) || 0),
  };

  const curl = (url: string) => `curl -sS '${url}' | jq .`;
  const fetchSnippet = (url: string) =>
    `const res = await fetch("${url}");\nconst data = await res.json();\nconsole.log(data);`;

  const copy = async (label: string, value: string) => {
    await copyText(value);
    toast(`${label} copied`);
  };

  const EndpointBlock = ({
    title,
    url,
    sample,
  }: {
    title: string;
    url: string;
    sample: string;
  }) => (
    <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void copy("URL", url)}>
            Copy URL
          </Button>
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void copy("curl", curl(url))}>
            Copy curl
          </Button>
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void copy("fetch", fetchSnippet(url))}>
            Copy fetch
          </Button>
        </div>
      </div>
      <p className="break-all font-mono text-[11px] text-emerald-400/90">{url}</p>
      <pre className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">{sample}</pre>
    </div>
  );

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Wilayah API Docs"}
        description={meta?.description ?? ""}
        slug="wilayah-api"
      />
      <div className="space-y-4">
        <Panel title="Contract">
          <div className="space-y-3 text-sm text-zinc-300">
            <p>
              Public static JSON API (no key). Base:{" "}
              <code className="font-mono text-zinc-100">{WILAYAH_BASE}</code>
            </p>
            <ul className="list-inside list-disc space-y-1 text-zinc-400">
              <li>
                CORS: <code className="text-zinc-300">Access-Control-Allow-Origin: *</code>
              </li>
              <li>Source CSV → build → GitHub Pages via{" "}
                <a
                  className="text-zinc-200 underline decoration-zinc-600 underline-offset-2"
                  href="https://github.com/riyanathariq/wilayah-indonesia"
                  target="_blank"
                  rel="noreferrer"
                >
                  riyanathariq/wilayah-indonesia
                </a>
              </li>
              <li>
                Kode lengths: <code className="text-zinc-300">2</code> provinsi ·{" "}
                <code className="text-zinc-300">4</code> kab/kota ·{" "}
                <code className="text-zinc-300">6</code> kecamatan ·{" "}
                <code className="text-zinc-300">10</code> desa/kelurahan
              </li>
            </ul>
          </div>
        </Panel>

        <Panel title="Path builder">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">province_id</span>
              <Input value={prov} onChange={(e) => setProv(e.target.value.replace(/\D/g, ""))} className="font-mono" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">regency_id</span>
              <Input value={kab} onChange={(e) => setKab(e.target.value.replace(/\D/g, ""))} className="font-mono" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">district_id</span>
              <Input value={kec} onChange={(e) => setKec(e.target.value.replace(/\D/g, ""))} className="font-mono" />
            </label>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            IDs update the endpoint URLs below. Defaults match Jawa Barat → Kab. Bogor → Cibinong.
          </p>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-2">
          <EndpointBlock title="GET provinces.json" url={urls.provinces} sample={SAMPLE_PROVINCE} />
          <EndpointBlock title="GET {prov}/regencies.json" url={urls.regencies} sample={SAMPLE_REGENCY} />
          <EndpointBlock title="GET {prov}/{kab}/district.json" url={urls.districts} sample={SAMPLE_DISTRICT} />
          <EndpointBlock
            title="GET {prov}/{kab}/{kec}/subdistrict.json"
            url={urls.villages}
            sample={SAMPLE_VILLAGE}
          />
        </div>

        <Panel title="Cascade integration pattern">
          <pre className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">{`// 1) Load provinces
const provinces = await fetch("${WILAYAH_BASE}/provinces.json").then(r => r.json());

// 2) On province pick → load kab/kota
const regencies = await fetch(\`${WILAYAH_BASE}/\${provinceId}/regencies.json\`).then(r => r.json());

// 3) On kab pick → parents already on item.province_id (lock UI)
// 4) Load kecamatan, then desa — each child carries parent ids
const villages = await fetch(
  \`${WILAYAH_BASE}/\${provinceId}/\${regencyId}/\${districtId}/subdistrict.json\`
).then(r => r.json());
// village.postal_code available when present`}</pre>
        </Panel>
      </div>
    </>
  );
}
