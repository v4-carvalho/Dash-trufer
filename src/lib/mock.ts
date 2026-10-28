import type { AdsDaily, Deal, ErpOrder, Ga4Daily, Range } from "./types";

// PRNG determinístico para os dados de demonstração não mudarem a cada render.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);

function eachDay(r: Range) {
  const out: string[] = [];
  for (let d = new Date(r.from); iso(d) <= r.to; d = addDays(d, 1)) out.push(iso(d));
  return out;
}

export function mockAds(r: Range): AdsDaily[] {
  const rand = rng(11);
  return eachDay(r).flatMap((date) => [
    { date, platform: "meta" as const, spend: 180 + rand() * 120, impressions: 14000 + rand() * 6000, clicks: 260 + rand() * 140 },
    { date, platform: "google" as const, spend: 240 + rand() * 160, impressions: 5000 + rand() * 2500, clicks: 150 + rand() * 90 },
  ]);
}

const LOST_REASONS = [
  "Volume/frete inviável",
  "Fora do escopo",
  "Preço abaixo do mercado",
  "Sem retorno do contato",
  "Optou por outro comprador",
];

export function mockDeals(r: Range): Deal[] {
  const rand = rng(23);
  const deals: Deal[] = [];
  const days = eachDay(r);
  days.forEach((date, di) => {
    const n = 3 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const x = rand();
      const reached = x < 0.42 ? "lead" : x < 0.72 ? "mql" : x < 0.93 ? "sql" : "won";
      const lost = reached !== "won" && rand() < 0.55;
      deals.push({
        id: `d${di}-${i}`,
        createdAt: date,
        reached,
        lost,
        lostReason: lost ? LOST_REASONS[Math.floor(rand() * LOST_REASONS.length)] : undefined,
        amount: reached === "won" ? 18000 + rand() * 60000 : 0,
      });
    }
  });
  return deals;
}

export function mockGa4(r: Range): Ga4Daily[] {
  const rand = rng(37);
  return eachDay(r).map((date) => ({
    date,
    sessions: 420 + Math.floor(rand() * 260),
    avgEngagementSec: 48 + rand() * 50,
    formSubmits: 6 + Math.floor(rand() * 9),
  }));
}

const CUSTOMERS = [
  "Metalúrgica Alfa", "Fundição Beta", "Siderúrgica Gama", "Ferro & Aço Delta",
  "Usinagem Ômega", "Forjaria Sigma", "Laminação Kappa", "Ligas Zeta",
  "Aciaria Lambda", "Metais Épsilon", "Fundições Íota", "Indústria Theta",
];

/** Histórico de 12 meses fixo (independe do filtro) — recorrência precisa de janela longa. */
export function mockOrders(today: Date): ErpOrder[] {
  const rand = rng(53);
  const orders: ErpOrder[] = [];
  CUSTOMERS.forEach((customerName, ci) => {
    const interval = 9 + Math.floor(rand() * 26); // cadência de compra em dias
    // clientes 9–11 "esfriaram": última compra há muito tempo
    const silent = ci >= 9 ? 55 + Math.floor(rand() * 60) : 0;
    let d = addDays(today, -365 - silent);
    const end = addDays(today, -silent);
    while (d < end) {
      const tons = 12 + rand() * 48;
      orders.push({
        customerId: `c${ci}`,
        customerName,
        date: iso(d),
        tons: Math.round(tons * 10) / 10,
        value: Math.round(tons * (2100 + rand() * 600)),
      });
      d = addDays(d, Math.max(3, Math.round(interval * (0.7 + rand() * 0.6))));
    }
  });
  return orders.sort((a, b) => a.date.localeCompare(b.date));
}
