import type { AdsDaily, Range } from "../types";

// O Google aposenta versões da API a cada poucos meses (v22 já foi bloqueada): se der
// UNSUPPORTED_VERSION, suba aqui ou defina GOOGLE_ADS_API_VERSION.
const VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v25";

interface GaqlRow {
  segments: { date: string };
  metrics: { costMicros?: string; impressions?: string; clicks?: string };
}

// O access token do Google vale ~1h; guardamos em memória do processo.
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) throw new Error(`Google OAuth: ${body.error ?? res.status}`);
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

export async function fetchGoogleAds(r: Range): Promise<AdsDaily[] | null> {
  const { GOOGLE_ADS_DEVELOPER_TOKEN } = process.env;
  // a API exige só dígitos; aceitamos o ID copiado da interface (123-456-7890)
  const digits = (v?: string) => v?.replace(/\D/g, "") ?? "";
  const GOOGLE_ADS_CUSTOMER_ID = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const GOOGLE_ADS_LOGIN_CUSTOMER_ID = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID || !process.env.GOOGLE_ADS_REFRESH_TOKEN) return null;

  const query = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date BETWEEN '${r.from}' AND '${r.to}'`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
    "Content-Type": "application/json",
  };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers["login-customer-id"] = GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  const res = await fetch(`https://googleads.googleapis.com/${VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Google Ads ${res.status}: ${err?.error?.message ?? "sem detalhe"}`);
  }
  const body = (await res.json()) as { results?: GaqlRow[] };
  return (body.results ?? []).map((x) => ({
    date: x.segments.date,
    platform: "google" as const,
    spend: Number(x.metrics.costMicros ?? 0) / 1e6,
    impressions: Number(x.metrics.impressions ?? 0),
    clicks: Number(x.metrics.clicks ?? 0),
  }));
}
