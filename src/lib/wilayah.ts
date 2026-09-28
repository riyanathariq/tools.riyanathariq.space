export const WILAYAH_BASE =
  "https://riyanathariq.github.io/wilayah-indonesia";

export type WilayahProvince = { id: number; value: string };

export type WilayahRegency = {
  id: number;
  province_id: number;
  type: string;
  value: string;
};

export type WilayahDistrict = {
  id: number;
  province_id: number;
  regency_id: number;
  value: string;
};

export type WilayahSubdistrict = {
  id: number;
  province_id: number;
  regency_id: number;
  district_id: number;
  value: string;
  postal_code?: string;
};

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 10 * 60 * 1000;

async function fetchJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${WILAYAH_BASE}${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as T;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Wilayah fetch failed (${res.status}): ${path}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, { at: Date.now(), data });
  return data;
}

export function provincesUrl() {
  return `${WILAYAH_BASE}/provinces.json`;
}

export function regenciesUrl(provinceId: number) {
  return `${WILAYAH_BASE}/${provinceId}/regencies.json`;
}

export function districtsUrl(provinceId: number, regencyId: number) {
  return `${WILAYAH_BASE}/${provinceId}/${regencyId}/district.json`;
}

export function subdistrictsUrl(
  provinceId: number,
  regencyId: number,
  districtId: number,
) {
  return `${WILAYAH_BASE}/${provinceId}/${regencyId}/${districtId}/subdistrict.json`;
}

export function getProvinces() {
  return fetchJson<WilayahProvince[]>("/provinces.json");
}

export function getRegencies(provinceId: number) {
  return fetchJson<WilayahRegency[]>(`/${provinceId}/regencies.json`);
}

/** Preload every kab/kota so Explorer can start from child level. */
export async function getAllRegencies(): Promise<WilayahRegency[]> {
  const provinces = await getProvinces();
  const batches = await Promise.all(
    provinces.map((p) => getRegencies(p.id).catch(() => [] as WilayahRegency[])),
  );
  return batches
    .flat()
    .slice()
    .sort((a, b) => a.value.localeCompare(b.value, "id"));
}

export function getDistricts(provinceId: number, regencyId: number) {
  return fetchJson<WilayahDistrict[]>(
    `/${provinceId}/${regencyId}/district.json`,
  );
}

export function getSubdistricts(
  provinceId: number,
  regencyId: number,
  districtId: number,
) {
  return fetchJson<WilayahSubdistrict[]>(
    `/${provinceId}/${regencyId}/${districtId}/subdistrict.json`,
  );
}

/** Normalize pasted kode: digits only. */
export function normalizeKode(input: string): string {
  return input.replace(/\D/g, "");
}

export type KodeParts = {
  raw: string;
  provinceId?: number;
  regencyId?: number;
  districtId?: number;
  villageId?: number;
  level: "invalid" | "province" | "regency" | "district" | "village";
};

export function parseKode(input: string): KodeParts {
  const raw = normalizeKode(input);
  if (![2, 4, 6, 10].includes(raw.length)) {
    return { raw, level: "invalid" };
  }
  const provinceId = Number(raw.slice(0, 2));
  if (raw.length === 2) return { raw, provinceId, level: "province" };
  const regencyId = Number(raw.slice(0, 4));
  if (raw.length === 4) return { raw, provinceId, regencyId, level: "regency" };
  const districtId = Number(raw.slice(0, 6));
  if (raw.length === 6) {
    return { raw, provinceId, regencyId, districtId, level: "district" };
  }
  return {
    raw,
    provinceId,
    regencyId,
    districtId,
    villageId: Number(raw),
    level: "village",
  };
}

export type WilayahResolved = {
  kode: string;
  level: KodeParts["level"];
  province?: WilayahProvince;
  regency?: WilayahRegency;
  district?: WilayahDistrict;
  village?: WilayahSubdistrict;
  path: string[];
  apiUrl: string;
};

export async function resolveKode(input: string): Promise<WilayahResolved> {
  const parts = parseKode(input);
  if (parts.level === "invalid" || !parts.provinceId) {
    throw new Error(
      "Kode must be 2 (provinsi), 4 (kab/kota), 6 (kecamatan), or 10 (desa/kelurahan) digits.",
    );
  }

  const provinces = await getProvinces();
  const province = provinces.find((p) => p.id === parts.provinceId);
  if (!province) throw new Error(`Province ${parts.provinceId} not found.`);

  const path = [province.value];
  let apiUrl = provincesUrl();
  const result: WilayahResolved = {
    kode: parts.raw,
    level: parts.level,
    province,
    path,
    apiUrl,
  };

  if (parts.level === "province") {
    result.apiUrl = regenciesUrl(parts.provinceId);
    return result;
  }

  const regencies = await getRegencies(parts.provinceId);
  const regency = regencies.find((r) => r.id === parts.regencyId);
  if (!regency) throw new Error(`Kab/Kota ${parts.regencyId} not found.`);
  result.regency = regency;
  path.push(regency.value);
  result.apiUrl = regenciesUrl(parts.provinceId);

  if (parts.level === "regency") {
    result.apiUrl = districtsUrl(parts.provinceId, parts.regencyId!);
    return result;
  }

  const districts = await getDistricts(parts.provinceId, parts.regencyId!);
  const district = districts.find((d) => d.id === parts.districtId);
  if (!district) throw new Error(`Kecamatan ${parts.districtId} not found.`);
  result.district = district;
  path.push(district.value);
  result.apiUrl = districtsUrl(parts.provinceId, parts.regencyId!);

  if (parts.level === "district") {
    result.apiUrl = subdistrictsUrl(
      parts.provinceId,
      parts.regencyId!,
      parts.districtId!,
    );
    return result;
  }

  const villages = await getSubdistricts(
    parts.provinceId,
    parts.regencyId!,
    parts.districtId!,
  );
  const village = villages.find((v) => v.id === parts.villageId);
  if (!village) throw new Error(`Desa/Kelurahan ${parts.villageId} not found.`);
  result.village = village;
  path.push(village.value);
  result.apiUrl = subdistrictsUrl(
    parts.provinceId,
    parts.regencyId!,
    parts.districtId!,
  );
  return result;
}

export function filterByQuery<T extends { value: string; id: number }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.value.toLowerCase().includes(q) || String(item.id).includes(q),
  );
}
