import type { RawData, Range } from "./types";

const ORDER = { lead: 0, mql: 1, sql: 2, won: 3 } as const;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function acquisition(raw: RawData, r: Range) {
  const inRange = (d: string) => d >= r.from && d <= r.to;
  const ads = raw.ads.filter((a) => inRange(a.date));
  const deals = raw.deals.filter((d) => inRange(d.createdAt));
  const ga4 = raw.ga4.filter((g) => inRange(g.date));

  const byPlatform = (p: "meta" | "google") => ads.filter((a) => a.platform === p);
  const spendOf = (p: "meta" | "google") => sum(byPlatform(p).map((a) => a.spend));
  const spend = sum(ads.map((a) => a.spend));
  const impressions = sum(ads.map((a) => a.impressions));
  const clicks = sum(ads.map((a) => a.clicks));

  const leads = deals.length;
  const mql = deals.filter((d) => ORDER[d.reached] >= ORDER.mql).length;
  const sql = deals.filter((d) => ORDER[d.reached] >= ORDER.sql).length;
  const won = deals.filter((d) => d.reached === "won").length;

  const reasons = new Map<string, number>();
  for (const d of deals) if (d.lost) reasons.set(d.lostReason ?? "Não informado", (reasons.get(d.lostReason ?? "Não informado") ?? 0) + 1);
  const lostTotal = sum([...reasons.values()]);

  const days = new Map<string, { date: string; spend: number; leads: number }>();
  for (const a of ads) {
    const row = days.get(a.date) ?? { date: a.date, spend: 0, leads: 0 };
    row.spend += a.spend;
    days.set(a.date, row);
  }
  for (const d of deals) {
    const row = days.get(d.createdAt) ?? { date: d.createdAt, spend: 0, leads: 0 };
    row.leads += 1;
    days.set(d.createdAt, row);
  }

  const sessions = sum(ga4.map((g) => g.sessions));
  const submits = sum(ga4.map((g) => g.formSubmits));

  return {
    spend,
    spendMeta: spendOf("meta"),
    spendGoogle: spendOf("google"),
    impressions,
    clicks,
    ctr: div(clicks, impressions),
    funnel: { leads, mql, sql, won, mqlRate: div(mql, leads), sqlRate: div(sql, mql), winRate: div(won, sql) },
    cpl: div(spend, leads),
    costPerMql: div(spend, mql),
    costPerSale: div(spend, won),
    wonRevenue: sum(deals.map((d) => d.amount)),
    lostReasons: [...reasons.entries()]
      .map(([reason, count]) => ({ reason, count, share: div(count, lostTotal) }))
      .sort((a, b) => b.count - a.count),
    daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    landing: {
      sessions,
      submits,
      conversion: div(submits, sessions),
      avgEngagementSec: div(sum(ga4.map((g) => g.avgEngagementSec * g.sessions)), sessions),
    },
  };
}

export interface CustomerRow {
  id: string;
  name: string;
  orders: number;
  tons: number;
  ltv: number;
  avgIntervalDays: number;
  daysSinceLast: number;
  cooling: boolean;
}

export function customers(raw: RawData, r: Range, today = new Date()) {
  const dayMs = 864e5;
  const inRange = raw.orders.filter((o) => o.date >= r.from && o.date <= r.to);
  const tons = sum(inRange.map((o) => o.tons));
  const revenue = sum(inRange.map((o) => o.value));

  const byCustomer = new Map<string, typeof raw.orders>();
  for (const o of raw.orders) byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) ?? []), o]);

  const rows: CustomerRow[] = [...byCustomer.entries()].map(([id, os]) => {
    const dates = os.map((o) => new Date(o.date).getTime()).sort((a, b) => a - b);
    const gaps = dates.slice(1).map((t, i) => (t - dates[i]) / dayMs);
    const avgInterval = gaps.length ? sum(gaps) / gaps.length : 0;
    const daysSinceLast = Math.floor((today.getTime() - dates[dates.length - 1]) / dayMs);
    return {
      id,
      name: os[0].customerName,
      orders: os.length,
      tons: sum(os.map((o) => o.tons)),
      ltv: sum(os.map((o) => o.value)),
      avgIntervalDays: Math.round(avgInterval),
      daysSinceLast,
      // esfriando: passou 1,5x a cadência habitual do próprio cliente (mínimo 30 dias)
      cooling: daysSinceLast > Math.max(30, avgInterval * 1.5),
    };
  });

  const monthly = new Map<string, { month: string; tons: number }>();
  for (const o of raw.orders) {
    const m = o.date.slice(0, 7);
    monthly.set(m, { month: m, tons: (monthly.get(m)?.tons ?? 0) + o.tons });
  }

  return {
    tons,
    revenue,
    ticket: div(revenue, inRange.length),
    orders: inRange.length,
    activeCustomers: new Set(inRange.map((o) => o.customerId)).size,
    avgFrequencyDays: Math.round(div(sum(rows.map((c) => c.avgIntervalDays)), rows.length)),
    avgLtv: div(sum(rows.map((c) => c.ltv)), rows.length),
    cooling: rows.filter((c) => c.cooling).sort((a, b) => b.daysSinceLast - a.daysSinceLast),
    rows: rows.sort((a, b) => b.ltv - a.ltv),
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
