"use client";

import { Code2, Eye } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudGate } from "@/components/cloud-gate";
import { Panel, ToolHeader } from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import { testSmtp, type SmtpTestResult } from "@/lib/api";
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmtpTestResult | null>(null);

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(text), [text]);

  const applyPreset = (key: string) => {
    setPreset(key);
    const p = PRESETS[key] ?? PRESETS.custom;
    setHost(p.host);
    setPort(p.port);
    setSecurity(p.security);
  };

  const onSecurityChange = (s: "starttls" | "ssl" | "none") => {
    setSecurity(s);
    setPreset("custom");
  };

  const onSubmit = async () => {
    const portNum = Number.parseInt(port.trim(), 10);
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      setResult({ ok: false, steps: [], error: "Port must be a number between 1 and 65535" });
      return;
    }

    setLoading(true);
    setResult(null);
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
      setResult(res);
    } catch (e) {
      setResult({
        ok: false,
        steps: [],
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setLoading(false);
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
        <div className="flex flex-col gap-3">
          <Panel title="Your SMTP">
            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
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
                  }}
                  className="font-mono"
                  placeholder="587"
                  autoComplete="off"
                />
              </label>
              <div className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                <p>Security</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["starttls", "ssl", "none"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={security === s ? "primary" : "outline"}
                      className="h-9 min-h-9 uppercase"
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
                  onChange={(e) => setUsername(e.target.value)}
                  className="font-mono"
                  autoComplete="username"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                  autoComplete="current-password"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Credentials are sent once to the API for the test and are never stored. Prefer app
              passwords.
            </p>
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

            <div className="mt-3">
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => void onSubmit()}
              >
                {loading ? "Sending…" : "Send test email"}
              </Button>
            </div>
          </Panel>

          {result ? (
            <Panel title="Result">
              <p
                className={cn(
                  "mb-3 text-sm font-medium",
                  result.ok ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {result.ok ? "Success — message accepted by SMTP server" : result.error || "Failed"}
              </p>
              <ul className="space-y-2">
                {result.steps.map((s, i) => (
                  <li
                    key={`${s.step}-${i}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs"
                  >
                    <span className={s.ok ? "text-emerald-400" : "text-rose-400"}>
                      {s.ok ? "OK" : "FAIL"}
                    </span>{" "}
                    <span className="text-zinc-400">{s.step}</span>
                    <div className="mt-1 whitespace-pre-wrap break-all text-zinc-300">{s.detail}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </CloudGate>
    </>
  );
}
