const KEY = "tools.recent.v1";
const MAX = 8;

export function getRecentToolSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function pushRecentToolSlug(slug: string) {
  if (typeof window === "undefined") return;
  const next = [slug, ...getRecentToolSlugs().filter((s) => s !== slug)].slice(
    0,
    MAX,
  );
  localStorage.setItem(KEY, JSON.stringify(next));
}
