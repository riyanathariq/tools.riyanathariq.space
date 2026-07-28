"use client";

import bcrypt from "bcryptjs";
import forge from "node-forge";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClearButton,
  CopyButton,
  Panel,
  SampleButton,
  ToolHeader,
} from "@/components/tool-workspace";
import { getToolBySlug } from "@/data/tools-registry";

const SAMPLE_CERT = `-----BEGIN CERTIFICATE-----
MIIBgzCCAS2gAwIBAgIBATANBgkqhkiG9w0BAQsFADAjMRQwEgYDVQQDEwtleGFt
cGxlLmNvbTELMAkGA1UEBhMCVVMwHhcNMjYwNzI4MDczMDAxWhcNMjcwNzI4MDcz
MDAxWjAjMRQwEgYDVQQDEwtleGFtcGxlLmNvbTELMAkGA1UEBhMCVVMwXDANBgkq
hkiG9w0BAQEFAANLADBIAkEAnI5RaZQcHygtTVs6xaUZVKTcNU+QArBqxutyPapU
8ZYvxALEbfbTCOYzzSQ6WIkq6YwCiBRQ2SebAWDG3KeA1QIDAQABo0wwSjAMBgNV
HRMEBTADAQH/MAsGA1UdDwQEAwIChDAtBgNVHREEJjAkggtleGFtcGxlLmNvbYIP
d3d3LmV4YW1wbGUuY29thwR/AAABMA0GCSqGSIb3DQEBCwUAA0EAYGhpGUZuYga1
B2mOtN4ZFgjms7bc8TWMaJPpEiuDxQI6gRXk01P98CPnINstLFcRVsk2H8TPQtle
z+Wx3G2H+A==
-----END CERTIFICATE-----`;

type CertInfo = {
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  sans: string[];
  fingerprintSha256: string | null;
};

type CertField = { shortName?: string; name?: string; value: string };

function formatDn(attrs: CertField[]): string {
  return attrs.map((a) => `${a.shortName ?? a.name}=${a.value}`).join(", ");
}

function extractSans(cert: ReturnType<typeof forge.pki.certificateFromPem>): string[] {
  const alt = cert.getExtension("subjectAltName") as
    | { altNames?: { type: number; value: string; ip?: string }[] }
    | undefined;
  if (!alt?.altNames?.length) return [];
  return alt.altNames.map((n) => {
    if (n.type === 7 && n.ip) return `IP: ${n.ip}`;
    if (n.type === 2) return `DNS: ${n.value}`;
    return String(n.value ?? n.ip ?? "unknown");
  });
}

function sha256Fingerprint(cert: ReturnType<typeof forge.pki.certificateFromPem>): string {
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(der);
  return md
    .digest()
    .toHex()
    .toUpperCase()
    .match(/.{1,2}/g)
    ?.join(":")
    ?? md.digest().toHex();
}

function parseCertificate(pem: string): CertInfo {
  const trimmed = pem.trim();
  if (!trimmed.includes("BEGIN CERTIFICATE")) {
    throw new Error("Paste a PEM certificate block (-----BEGIN CERTIFICATE-----)");
  }
  const cert = forge.pki.certificateFromPem(trimmed);
  return {
    subject: formatDn(cert.subject.attributes),
    issuer: formatDn(cert.issuer.attributes),
    serial: cert.serialNumber,
    notBefore: cert.validity.notBefore.toUTCString(),
    notAfter: cert.validity.notAfter.toUTCString(),
    sans: extractSans(cert),
    fingerprintSha256: sha256Fingerprint(cert),
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 break-all font-mono text-sm text-zinc-100">{value || "—"}</p>
    </div>
  );
}

export function certInspector() {
  const meta = getToolBySlug("cert-inspector");
  const [pem, setPem] = useState("");
  const [info, setInfo] = useState<CertInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pem.trim()) {
      setInfo(null);
      setError(null);
      return;
    }
    try {
      setInfo(parseCertificate(pem));
      setError(null);
    } catch (e) {
      setInfo(null);
      setError(e instanceof Error ? e.message : "Failed to parse certificate");
    }
  }, [pem]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Certificate Inspector"}
        description={meta?.description ?? "Inspect X.509 PEM certificates locally."}
        slug="cert-inspector"
      />
      <div className="flex min-h-[24rem] flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <SampleButton label="Sample PEM" onClick={() => setPem(SAMPLE_CERT)} />
          <ClearButton onClick={() => setPem("")} />
        </div>

        <Panel title="Certificate (PEM)">
          <Textarea
            value={pem}
            onChange={(e) => setPem(e.target.value)}
            placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
            className="min-h-[10rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
          />
        </Panel>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {info ? (
          <Panel title="Parsed details">
            <div className="space-y-2">
              <InfoRow label="Subject" value={info.subject} />
              <InfoRow label="Issuer" value={info.issuer} />
              <InfoRow label="Serial" value={info.serial} />
              <InfoRow label="Valid from (notBefore)" value={info.notBefore} />
              <InfoRow label="Valid until (notAfter)" value={info.notAfter} />
              {info.fingerprintSha256 ? (
                <InfoRow label="SHA-256 fingerprint" value={info.fingerprintSha256} />
              ) : null}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                <p className="text-xs text-zinc-500">Subject Alternative Names (SANs)</p>
                {info.sans.length ? (
                  <ul className="mt-1 space-y-1 font-mono text-sm text-zinc-100">
                    {info.sans.map((san) => (
                      <li key={san}>{san}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-sm text-zinc-500">None listed</p>
                )}
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}

type HashTab = "generate" | "verify";

export function passwordHash() {
  const meta = getToolBySlug("password-hash");
  const [tab, setTab] = useState<HashTab>("generate");
  const [password, setPassword] = useState("");
  const [cost, setCost] = useState(10);
  const [hash, setHash] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateHash = useCallback(async () => {
    if (!password) {
      setHash("");
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rounds = Math.min(12, Math.max(4, cost));
      const result = await bcrypt.hash(password, rounds);
      setHash(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hashing failed");
      setHash("");
    } finally {
      setLoading(false);
    }
  }, [password, cost]);

  const verify = useCallback(async () => {
    if (!verifyPassword || !verifyHash.trim()) {
      setVerifyResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await bcrypt.compare(verifyPassword, verifyHash.trim());
      setVerifyResult(ok);
    } catch (e) {
      setVerifyResult(null);
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [verifyPassword, verifyHash]);

  const costLabel = useMemo(() => Math.min(12, Math.max(4, cost)), [cost]);

  return (
    <>
      <ToolHeader
        name={meta?.name ?? "Password Hash (bcrypt)"}
        description={meta?.description ?? "Generate and verify bcrypt hashes in the browser."}
        slug="password-hash"
      />
      <div className="flex min-h-[20rem] flex-col gap-3">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Client-side only — passwords and hashes never leave your browser. Do not use for
          production credential storage without proper security review.
        </p>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          {(["generate", "verify"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={tab === t ? "primary" : "outline"}
              onClick={() => setTab(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Cost (rounds)
            <Input
              type="number"
              min={4}
              max={12}
              value={cost}
              onChange={(e) => setCost(Math.min(12, Math.max(4, Number(e.target.value) || 10)))}
              className="w-16"
            />
            <span className="text-xs text-zinc-500">({costLabel})</span>
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {tab === "generate" ? (
          <>
            <Panel title="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to hash…"
              />
              <Button type="button" className="mt-3" onClick={generateHash} disabled={loading}>
                {loading ? "Hashing…" : "Generate hash"}
              </Button>
            </Panel>
            <Panel
              title="bcrypt hash"
              actions={hash ? <CopyButton value={hash} /> : undefined}
            >
              <Textarea
                value={hash}
                readOnly
                placeholder="Hash appears here…"
                className="min-h-[4rem] border-0 bg-zinc-950 p-0 font-mono text-xs text-emerald-300 focus:ring-0"
              />
            </Panel>
          </>
        ) : (
          <>
            <Panel title="Password">
              <Input
                type="password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                placeholder="Password to verify…"
              />
            </Panel>
            <Panel title="bcrypt hash">
              <Textarea
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                placeholder="$2a$10$…"
                className="min-h-[4rem] border-0 bg-zinc-950 p-0 font-mono text-xs focus:ring-0"
              />
              <Button type="button" className="mt-3" onClick={verify} disabled={loading}>
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </Panel>
            {verifyResult !== null ? (
              <p
                className={
                  verifyResult
                    ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
                    : "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                }
              >
                {verifyResult ? "Password matches hash." : "Password does not match hash."}
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
