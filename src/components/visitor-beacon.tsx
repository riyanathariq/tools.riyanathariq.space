"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "tools_visitor_id";
const SESSION_KEY = "tools_session_id";
const VISITOR_COOKIE = "tools_vid";
const SESSION_COOKIE = "tools_sid";
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function randomID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function setCookie(name: string, value: string, maxAge: number) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function ensureVisitorID(): string {
  let id = "";
  try {
    id = localStorage.getItem(VISITOR_KEY) || "";
  } catch {
    /* ignore */
  }
  if (!id || id.length < 8) {
    id = randomID();
    try {
      localStorage.setItem(VISITOR_KEY, id);
    } catch {
      /* ignore */
    }
  }
  setCookie(VISITOR_COOKIE, id, YEAR_SECONDS);
  return id;
}

function ensureSessionID(): string {
  let id = "";
  try {
    id = sessionStorage.getItem(SESSION_KEY) || "";
  } catch {
    /* ignore */
  }
  if (!id || id.length < 8) {
    id = randomID();
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      /* ignore */
    }
  }
  // Session cookie (no Max-Age) mirrors sessionStorage lifetime.
  setCookie(SESSION_COOKIE, id, 0);
  return id;
}

/** Fires once per app shell mount (not on every /t/* navigation). */
export function VisitorBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const visitor_id = ensureVisitorID();
    const session_id = ensureSessionID();
    const path = pathname || "/";
    const referer = typeof document !== "undefined" ? document.referrer || "" : "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const body = JSON.stringify({ visitor_id, session_id, path, referer, origin });

    // Prefer fetch+credentials so a logged-in visitor can be linked to user_id.
    void fetch("/api/events/visitor", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
    // Fire once per shell mount — not on every /t/* navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
