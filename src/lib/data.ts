import { fetchDeals } from "./connectors/rdstation";
import { fetchMetaAds } from "./connectors/meta";
import { fetchGoogleAds } from "./connectors/google-ads";
import { fetchGa4 } from "./connectors/ga4";
import { fetchErpOrders } from "./connectors/erp";
import { addDays, iso, mockAds, mockDeals, mockGa4, mockOrders } from "./mock";
import type { RawData, Range, SourceStatus } from "./types";

export function rangeFromDays(days: number, today = new Date()): Range {
  return { from: iso(addDays(today, -(days - 1))), to: iso(today), days };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

/** Lê ?from=&to= (filtro personalizado); sem período válido, últimos 30 dias. */
export function resolveRange(sp: { from?: string | string[]; to?: string | string[] }, today = new Date()): Range {
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  if (ISO_DAY.test(from) && ISO_DAY.test(to) && from <= to) {
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
    if (days <= MAX_DAYS) return { from, to, days };
  }
  return rangeFromDays(30, today);
}

/** Tenta o conector real; sem chave ou com erro, cai para demo e sinaliza na UI. */
async function load<T>(live: () => Promise<T | null>, demo: () => T): Promise<[T, SourceStatus]> {
  try {
    const data = await live();
    if (data) return [data, "live"];
  } catch (e) {
    console.error("[connector]", e instanceof Error ? e.message : e);
  }
  return [demo(), "demo"];
}

export async function getRawData(r: Range): Promise<RawData> {
  const today = new Date();
  const [[deals, rd], [meta, mt], [google, gg], [ga4, ga], [orders, erp]] = await Promise.all([
    load(() => fetchDeals(r), () => mockDeals(r)),
    load(() => fetchMetaAds(r), () => mockAds(r).filter((a) => a.platform === "meta")),
    load(() => fetchGoogleAds(r), () => mockAds(r).filter((a) => a.platform === "google")),
    load(() => fetchGa4(r), () => mockGa4(r)),
    load(() => fetchErpOrders(), () => mockOrders(today)),
  ]);
  return {
    deals,
    ads: [...meta, ...google],
    ga4,
    orders,
    sources: { rdstation: rd, meta: mt, google: gg, ga4: ga, erp },
  };
}
