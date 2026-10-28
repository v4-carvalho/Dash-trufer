import { createSign } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Ga4Daily, Range } from "../types";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cached: { token: string; expiresAt: number } | null = null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const file = path.resolve(process.cwd(), process.env.GA4_SERVICE_ACCOUNT_FILE!);
  const sa = JSON.parse(await fs.readFile(file, "utf8")) as ServiceAccount;

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const b = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !b.access_token) throw new Error(`GA4 OAuth: ${b.error_description ?? res.status}`);
  cached = { token: b.access_token, expiresAt: Date.now() + (b.expires_in ?? 3600) * 1000 };
  return cached.token;
}

interface ReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

async function runReport(property: string, body: object): Promise<ReportRow[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`GA4 ${res.status}: ${err?.error?.message ?? "sem detalhe"}`);
  }
  return ((await res.json()) as { rows?: ReportRow[] }).rows ?? [];
}

// YYYYMMDD -> YYYY-MM-DD
const day = (v: string) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;

export async function fetchGa4(r: Range): Promise<Ga4Daily[] | null> {
  const property = process.env.GA4_PROPERTY_ID?.replace(/\D/g, "");
  if (!property || !process.env.GA4_SERVICE_ACCOUNT_FILE) return null;
  const dateRanges = [{ startDate: r.from, endDate: r.to }];
  const dimensions = [{ name: "date" }];

  // Duas consultas: o filtro por evento restringiria também as sessões.
  const [traffic, forms] = await Promise.all([
    runReport(property, { dateRanges, dimensions, metrics: [{ name: "sessions" }, { name: "userEngagementDuration" }], limit: 400 }),
    runReport(property, {
      dateRanges,
      dimensions,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: process.env.GA4_FORM_EVENT ?? "envio_formulario" } },
      },
      limit: 400,
    }),
  ]);

  const submits = new Map(forms.map((x) => [day(x.dimensionValues[0].value), Number(x.metricValues[0].value)]));
  return traffic
    .map((x) => {
      const date = day(x.dimensionValues[0].value);
      const sessions = Number(x.metricValues[0].value);
      return {
        date,
        sessions,
        avgEngagementSec: sessions ? Number(x.metricValues[1].value) / sessions : 0,
        formSubmits: submits.get(date) ?? 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
