"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudGate } from "@/components/cloud-gate";
import { Panel, ToolHeader } from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";
import { testSmtp, type SmtpTestResult } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRESETS: Record<string, { host: string; port: number; security: "starttls" | "ssl" | "none" }> = {
  custom: { host: "", port: 587, security: "starttls" },
  gmail: { host: "smtp.gmail.com", port: 587, security: "starttls" },
  outlook: { host: "smtp.office365.com", port: 587, security: "starttls" },
  ses: { host: "email-smtp.us-east-1.amazonaws.com", port: 587, security: "starttls" },
  sendgrid: { host: "smtp.sendgrid.net", port: 587, security: "starttls" },
};

export function smtpTester() {
  const meta = getToolBySlug("smtp-tester");
  const [preset, setPreset] = useState("custom");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [security, setSecurity] = useState<"starttls" | "ssl" | "none">("starttls");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("SMTP test from tools.riyanathariq.space");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmtpTestResult | null>(null);

  const applyPreset = (key: string) => {
    setPreset(key);
    const p = PRESETS[key] ?? PRESETS.custom;
    setHost(p.host);
    setPort(p.port);
    setSecurity(p.security);
  };

  const onSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await testSmtp({
        host,
        port,
        security,
        username,
        password,
        from,
        to,
        subject,
        text,
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
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={preset === key ? "primary" : "outline"}
                  className="h-9 min-h-9 capitalize"
                  onClick={() => applyPreset(key)}
                >
                  {key}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-400">
                Host
                <Input value={host} onChange={(e) => setHost(e.target.value)} className="font-mono" placeholder="smtp.example.com" />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Port
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="font-mono"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                Security
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["starttls", "ssl", "none"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={security === s ? "primary" : "outline"}
                      className="h-9 min-h-9 uppercase"
                      onClick={() => setSecurity(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Username
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="font-mono" />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                  autoComplete="off"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Credentials are sent once to the API for the test and are never stored. Prefer app passwords.
            </p>
          </Panel>

          <Panel title="Test email">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-400">
                From
                <Input value={from} onChange={(e) => setFrom(e.target.value)} className="font-mono" />
              </label>
              <label className="space-y-1 text-sm text-zinc-400">
                To
                <Input value={to} onChange={(e) => setTo(e.target.value)} className="font-mono" />
              </label>
              <label className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                Subject
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm text-zinc-400 sm:col-span-2">
                Body
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[7rem]"
                  placeholder="Optional — a default test body is used if empty"
                />
              </label>
            </div>
            <div className="mt-3">
              <Button type="button" disabled={loading} onClick={() => void onSubmit()}>
                {loading ? "Sending…" : "Send test email"}
              </Button>
            </div>
          </Panel>

          {result ? (
            <Panel title="Result">
              <p className={cn("mb-3 text-sm font-medium", result.ok ? "text-emerald-400" : "text-rose-400")}>
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
