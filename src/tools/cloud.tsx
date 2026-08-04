"use client";

import { CheckCircle2, Code2, Eye, KeyRound, Loader2, Send, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudGate } from "@/components/cloud-gate";
import { Panel, ToolHeader } from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import {
  checkSmtpAuth,
  testSmtp,
  type SmtpAuthCheckResult,
  type SmtpTestResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PRESETS: Record<string, { host: string; port: string; security: "starttls" | "ssl" | "none" }> =
  {
    custom: { host: "", port: "587", security: "starttls" },
    gmail: { host: "smtp.gmail.com", port: "587", security: "starttls" },
    outlook: { host: "smtp.office365.com", port: "587", security: "starttls" },
    ses: { host: "email-smtp.us-east-1.amazonaws.com", port: "587", security: "starttls" },
    sendgrid: { host: "smtp.sendgrid.net", port: "587", security: "starttls" },
  };

type MobilePane = "editor" | "preview";

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPreviewSrcDoc(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:28px;font-family:ui-sans-serif,system-ui,sans-serif;color:#71717a;background:#fff;font-size:14px;line-height:1.6;">Default test body will be used when empty.</body></html>`;
  }
  if (looksLikeHtml(trimmed)) {
    if (/<html[\s>]/i.test(trimmed)) return trimmed;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;font-family:ui-sans-serif,system-ui,sans-serif;color:#18181b;background:#fff;">${trimmed}</body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:28px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;color:#18181b;background:#fff;font-size:13px;line-height:1.65;">${escapeHtml(trimmed)}</body></html>`;
}

function parsePort(port: string): number | null {
  const portNum = Number.parseInt(port.trim(), 10);
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) return null;
  return portNum;
}

export function smtpTester() {
  const meta = getToolBySlug("smtp-tester");
  const [preset, setPreset] = useState("custom");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [security, setSecurity] = useState<"starttls" | "ssl" | "none">("starttls");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("SMTP test from tools.riyanathariq.space");
  const [text, setText] = useState(
    "<p>Hello — this is an <strong>SMTP test</strong> from tools.riyanathariq.space.</p>",
  );
  const [mobilePane, setMobilePane] = useState<MobilePane>("editor");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authResult, setAuthResult] = useState<SmtpAuthCheckResult | null>(null);
  const [sendResult, setSendResult] = useState<SmtpTestResult | null>(null);

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(text), [text]);
  const busy = sending || checking;

  const applyPreset = (key: string) => {
    setPreset(key);
    const p = PRESETS[key] ?? PRESETS.custom;
    setHost(p.host);
    setPort(p.port);
    setSecurity(p.security);
    setAuthResult(null);
  };

  const onSecurityChange = (s: "starttls" | "ssl" | "none") => {
    setSecurity(s);
    setPreset("custom");
    setAuthResult(null);
  };

  const onCheckAuth = async () => {
    const portNum = parsePort(port);
    if (portNum === null) {
      setAuthResult({ ok: false, error: "Port must be a number between 1 and 65535" });
      return;
    }
    if (!host.trim() || !username.trim() || !password) {
      setAuthResult({ ok: false, error: "Host, username, and password are required" });
      return;
    }

    setChecking(true);
    setAuthResult(null);
    try {
      const res = await checkSmtpAuth({
        host,
        port: portNum,
        security,
        username,
        password,
      });
      setAuthResult(res);
    } catch (e) {
      setAuthResult({
        ok: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setChecking(false);
    }
  };

  const onSubmit = async () => {
    const portNum = parsePort(port);
    if (portNum === null) {
      setSendResult({ ok: false, steps: [], error: "Port must be a number between 1 and 65535" });
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const res = await testSmtp({
        host,
        port: portNum,
        security,
        username,
        password,
        from,
        to,
        subject,
        text,
        html: looksLikeHtml(text),
      });
      setSendResult(res);
    } catch (e) {
      setSendResult({
        ok: false,
        steps: [],
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "SMTP Tester"}
        description={meta?.description ?? "Test sending email with your own SMTP credentials."}
        slug="smtp-tester"
      />
      <CloudGate toolName="SMTP Tester">
        <div className="flex flex-col gap-3 sm:gap-4">
          <Panel title="Your SMTP">
            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Object.keys(PRESETS).map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={preset === key ? "primary" : "outline"}
                  className="h-9 min-h-9 shrink-0 capitalize"
                  onClick={() => applyPreset(key)}
                >
                  {key}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-400">
                Host
                <Input
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setPreset("custom");
                    setAuthResult(null);
                  }}
                  className="font-mono"
                  placeholder="smtp.example.com"
                  autoComplete="off"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Port
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value.replace(/[^\d]/g, "").slice(0, 5));
                    setPreset("custom");
                    setAuthResult(null);
                  }}
                  className="font-mono"
                  placeholder="587"
                  autoComplete="off"
                />
              </label>
              <div className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                <p>Security</p>
                <div className="grid grid-cols-3 gap-2 pt-1 sm:flex sm:flex-wrap">
                  {(["starttls", "ssl", "none"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={security === s ? "primary" : "outline"}
                      className="h-9 min-h-9 w-full uppercase sm:w-auto"
                      onClick={() => onSecurityChange(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="space-y-1 text-sm text-zinc-400">
                Username
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setAuthResult(null);
                  }}
                  className="font-mono"
                  autoComplete="username"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthResult(null);
                  }}
                  className="font-mono"
                  autoComplete="current-password"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => void onCheckAuth()}
              >
                {checking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Test credentials
                  </>
                )}
              </Button>
              <p className="text-xs leading-relaxed text-zinc-500 sm:max-w-sm sm:text-right">
                Connect + AUTH only — no email is sent. Credentials are never stored.
              </p>
            </div>

            {authResult ? (
              <div
                className={cn(
                  "mt-3 flex gap-3 rounded-2xl border px-3.5 py-3 sm:px-4",
                  authResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10",
                )}
              >
                {authResult.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                )}
                <div className="min-w-0 space-y-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      authResult.ok ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {authResult.ok
                      ? authResult.message || "Credentials accepted"
                      : authResult.error || "Credential check failed"}
                  </p>
                  {authResult.host ? (
                    <p className="break-all font-mono text-xs text-zinc-400">
                      {authResult.host}:{authResult.port} · {authResult.security}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Test email">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-400">
                From
                <Input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="font-mono"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                To
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="font-mono"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                Subject
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-400">Body</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1 lg:hidden">
                {(
                  [
                    { id: "editor", label: "Editor", icon: Code2 },
                    { id: "preview", label: "Preview", icon: Eye },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobilePane(id)}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors",
                      mobilePane === id
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                <section
                  className={cn(
                    "flex h-[20rem] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:h-[22rem]",
                    mobilePane === "editor" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Code2 className="size-4 text-emerald-400" />
                      <p className="text-sm font-medium">Editor</p>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {looksLikeHtml(text) ? "HTML" : "Plain text"}
                    </p>
                  </div>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    spellCheck={false}
                    className="h-full min-h-0 flex-1 resize-none rounded-none border-0 bg-zinc-950 px-3 py-3 font-mono text-xs leading-relaxed focus:border-transparent focus:ring-0"
                    placeholder="Plain text or HTML — empty uses a default test body"
                  />
                </section>

                <section
                  className={cn(
                    "flex h-[20rem] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 sm:h-[22rem]",
                    mobilePane === "preview" ? "flex" : "hidden lg:flex",
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Eye className="size-4 text-emerald-400" />
                      <p className="text-sm font-medium">Live Preview</p>
                    </div>
                    <p className="max-w-[55%] truncate text-[11px] text-zinc-500">
                      {subject || "—"}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 bg-zinc-900/80 p-3 sm:p-4">
                    <div className="mx-auto h-full max-w-[450px] overflow-hidden rounded-2xl border border-zinc-800 bg-white shadow-md">
                      <iframe
                        title="Email body preview"
                        sandbox=""
                        srcDoc={previewSrcDoc}
                        className="h-full w-full border-0 bg-white"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => void onSubmit()}
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send test email
                  </>
                )}
              </Button>
            </div>
          </Panel>

          {sendResult ? (
            <Panel title="Send result">
              <div
                className={cn(
                  "mb-3 flex gap-3 rounded-2xl border px-3.5 py-3",
                  sendResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10",
                )}
              >
                {sendResult.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                )}
                <p
                  className={cn(
                    "text-sm font-medium",
                    sendResult.ok ? "text-emerald-300" : "text-rose-300",
                  )}
                >
                  {sendResult.ok
                    ? "Success — message accepted by SMTP server"
                    : sendResult.error || "Failed"}
                </p>
              </div>
              {sendResult.steps.length > 0 ? (
                <ul className="space-y-2">
                  {sendResult.steps.map((s, i) => (
                    <li
                      key={`${s.step}-${i}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs"
                    >
                      <span className={s.ok ? "text-emerald-400" : "text-rose-400"}>
                        {s.ok ? "OK" : "FAIL"}
                      </span>{" "}
                      <span className="text-zinc-400">{s.step}</span>
                      <div className="mt-1 whitespace-pre-wrap break-all text-zinc-300">
                        {s.detail}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </CloudGate>
    </>
  );
}
