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
