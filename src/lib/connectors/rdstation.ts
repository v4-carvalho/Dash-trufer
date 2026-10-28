import { promises as fs } from "node:fs";
import path from "node:path";
import type { Deal, Range } from "../types";

const API = "https://api.rd.services/crm/v2";
const TOKEN_URL = "https://api.rd.services/oauth2/token";
const STORE = path.join(process.cwd(), ".data", "rdstation-tokens.json");

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// O refresh token gira a cada renovação (o anterior morre), então o novo precisa ser
// persistido. Arquivo local serve para dev/servidor próprio; em Vercel (disco somente
// leitura) trocar por tabela no Supabase mantendo as funções read/write.
async function readTokens(): Promise<Tokens | null> {
  try {
    return JSON.parse(await fs.readFile(STORE, "utf8")) as Tokens;
  } catch {
    const { RDSTATION_ACCESS_TOKEN: a, RDSTATION_REFRESH_TOKEN: r } = process.env;
    return a && r ? { accessToken: a, refreshToken: r, expiresAt: 0 } : null;
  }
}

async function writeTokens(t: Tokens) {
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(t));
}

let refreshing: Promise<Tokens> | null = null;

async function refresh(current: Tokens): Promise<Tokens> {
  // uma única renovação por vez: duas em paralelo invalidariam uma à outra
  refreshing ??= (async () => {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.RDSTATION_CLIENT_ID!,
        client_secret: process.env.RDSTATION_CLIENT_SECRET!,
        refresh_token: current.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const b = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!res.ok || !b.access_token || !b.refresh_token) throw new Error(`RD Station OAuth ${res.status}`);
    const next = { accessToken: b.access_token, refreshToken: b.refresh_token, expiresAt: Date.now() + (b.expires_in ?? 7200) * 1000 };
    await writeTokens(next);
    return next;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function accessToken(): Promise<string> {
  let t = await readTokens();
  if (!t) throw new Error("RD Station: sem tokens");
  // expiresAt 0 = token vindo do .env, de idade desconhecida: renova na primeira vez
  if (t.expiresAt < Date.now() + 120_000) t = await refresh(t);
  return t.accessToken;
}

async function get<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${API}/${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${await accessToken()}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 429) throw new Error("RD Station: limite de requisições (120/min)");
  if (!res.ok) throw new Error(`RD Station ${res.status} em ${pathAndQuery.split("?")[0]}`);
  return (await res.json()) as T;
}

async function listAll<T>(resource: string, query = ""): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const sep = query ? `${query}&` : "";
    const body = await get<{ data: T[] }>(`${resource}?${sep}page[number]=${page}&page[size]=200`);
    out.push(...body.data);
    if (body.data.length < 200) break;
  }
  return out;
}

interface RdDeal {
  id: string;
  status: "won" | "lost" | "ongoing" | "paused";
  stage_id: string;
  lost_reason_id?: string | null;
  total_price?: number | null;
  created_at: string;
}

export async function fetchDeals(r: Range): Promise<Deal[] | null> {
  if (!process.env.RDSTATION_CLIENT_ID || !process.env.RDSTATION_REFRESH_TOKEN) return null;
  const pipeline = process.env.RDSTATION_PIPELINE_ID;
  const mqlOrder = Number(process.env.RDSTATION_MQL_ORDER ?? 3);
  const sqlOrder = Number(process.env.RDSTATION_SQL_ORDER ?? 4);

  const filter = [`created_at:>="${r.from} 00:00:00"`, `created_at:<="${r.to} 23:59:59"`, pipeline && `pipeline_id:${pipeline}`]
    .filter(Boolean)
    .join(" ");

  const [deals, stages, reasons] = await Promise.all([
    listAll<RdDeal>("deals", `filter=${encodeURIComponent(filter)}`),
    pipeline ? listAll<{ id: string; order?: number; position?: number }>(`pipelines/${pipeline}/stages`) : Promise.resolve([]),
    listAll<{ id: string; name: string }>("lost_reasons"),
  ]);
  const orderOf = new Map(stages.map((s) => [s.id, s.order ?? s.position ?? 0]));
  const reasonName = new Map(reasons.map((x) => [x.id, x.name]));

  return deals.map((d) => {
    const order = orderOf.get(d.stage_id) ?? 0;
    const lost = d.status === "lost";
    return {
      id: d.id,
      createdAt: d.created_at.slice(0, 10),
      reached: d.status === "won" ? "won" : order >= sqlOrder ? "sql" : order >= mqlOrder ? "mql" : "lead",
      lost,
      lostReason: lost ? (reasonName.get(d.lost_reason_id ?? "") ?? "Não informado") : undefined,
      amount: d.status === "won" ? (d.total_price ?? 0) : 0,
    };
  });
}
