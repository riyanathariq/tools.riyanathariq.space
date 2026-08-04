export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

async function parseJSON<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/auth/me", { credentials: "include", cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load session");
  const data = await parseJSON<{ user: AuthUser }>(res);
  return data.user ?? null;
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
}

export function loginWithGoogle(next?: string) {
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  window.location.href = `/auth/google${q}`;
}

export type SmtpTestPayload = {
  host: string;
  port: number;
  security: "starttls" | "ssl" | "none";
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  /** When true, message is sent as text/html. */
  html?: boolean;
};

export type SmtpStep = {
  step: string;
  ok: boolean;
  detail: string;
  at: string;
};

export type SmtpTestResult = {
  ok: boolean;
  steps: SmtpStep[];
  error?: string;
};

export async function testSmtp(payload: SmtpTestPayload): Promise<SmtpTestResult> {
  const res = await fetch("/api/cloud/smtp/test", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJSON<SmtpTestResult & { error?: string }>(res);
  if (res.status === 401) {
    return { ok: false, steps: [], error: "Sign in required" };
  }
  if (res.status === 429) {
    return { ok: false, steps: [], error: data.error || "Rate limit exceeded" };
  }
  return data;
}

export type SmtpAuthCheckPayload = {
  host: string;
  port: number;
  security: "starttls" | "ssl" | "none";
  username: string;
  password: string;
};

export type SmtpAuthCheckResult = {
  ok: boolean;
  message?: string;
  error?: string;
  host?: string;
  port?: number;
  security?: string;
};

export async function checkSmtpAuth(payload: SmtpAuthCheckPayload): Promise<SmtpAuthCheckResult> {
  const res = await fetch("/api/cloud/smtp/check-auth", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJSON<SmtpAuthCheckResult>(res);
  if (res.status === 401) {
    return { ok: false, error: "Sign in required" };
  }
  if (res.status === 429) {
    return { ok: false, error: data.error || "Rate limit exceeded" };
  }
  return data;
}

export type WebhookBin = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  lastHitAt?: string;
};

export type WebhookHitSummary = {
  id: string;
  receivedAt: string;
  method: string;
  path: string;
  query?: string;
  contentType?: string;
  bodyBytes: number;
  ip: string;
};

export type WebhookHit = WebhookHitSummary & {
  binId: string;
  queryParams?: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  bodyTruncated: boolean;
  userAgent?: string;
};

export type WebhookLimits = {
  maxBinsPerUser: number;
  maxHitsPerBin: number;
  maxBodyBytes: number;
  ttlHours: number;
};

export type WebhookBinItem = {
  bin: WebhookBin;
  hookUrl: string;
};

async function apiError(res: Response, data: { error?: string }): Promise<never> {
  if (res.status === 401) throw new Error("Sign in required");
  if (res.status === 429) throw new Error(data.error || "Rate limit exceeded");
  throw new Error(data.error || `Request failed (${res.status})`);
}

export async function listWebhookBins(): Promise<{
  bins: WebhookBinItem[];
  limits: WebhookLimits;
}> {
  const res = await fetch("/api/cloud/webhook/bins", {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJSON<{ bins: WebhookBinItem[]; limits: WebhookLimits; error?: string }>(res);
  if (!res.ok) await apiError(res, data);
  return { bins: data.bins ?? [], limits: data.limits };
}

export async function createWebhookBin(name?: string): Promise<WebhookBinItem & { limits: WebhookLimits }> {
  const res = await fetch("/api/cloud/webhook/bins", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name ?? "" }),
  });
  const data = await parseJSON<WebhookBinItem & { limits: WebhookLimits; error?: string }>(res);
  if (!res.ok) await apiError(res, data);
  return data;
}

export async function getWebhookBin(id: string): Promise<{
  bin: WebhookBin;
  hookUrl: string;
  hits: WebhookHitSummary[];
  limits: WebhookLimits;
}> {
  const res = await fetch(`/api/cloud/webhook/bins/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJSON<{
    bin: WebhookBin;
    hookUrl: string;
    hits: WebhookHitSummary[];
    limits: WebhookLimits;
    error?: string;
  }>(res);
  if (!res.ok) await apiError(res, data);
  return data;
}

export async function deleteWebhookBin(id: string): Promise<void> {
  const res = await fetch(`/api/cloud/webhook/bins/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJSON<{ error?: string }>(res);
  if (!res.ok) await apiError(res, data);
}

export async function clearWebhookHits(id: string): Promise<WebhookBin> {
  const res = await fetch(`/api/cloud/webhook/bins/${id}/hits`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJSON<{ bin: WebhookBin; error?: string }>(res);
  if (!res.ok) await apiError(res, data);
  return data.bin;
}

export async function getWebhookHit(binId: string, hitId: string): Promise<WebhookHit> {
  const res = await fetch(`/api/cloud/webhook/bins/${binId}/hits/${hitId}`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJSON<{ hit: WebhookHit; error?: string }>(res);
  if (!res.ok) await apiError(res, data);
  return data.hit;
}
