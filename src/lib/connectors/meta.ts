import type { AdsDaily, Range } from "../types";

interface MetaRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
}

export async function fetchMetaAds(r: Range): Promise<AdsDaily[] | null> {
  const token = process.env.META_ACCESS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID; // sem o prefixo "act_"
  if (!token || !account) return null;

  const params = new URLSearchParams({
    fields: "spend,impressions,clicks",
    time_increment: "1",
    time_range: JSON.stringify({ since: r.from, until: r.to }),
    limit: "500",
    access_token: token,
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/act_${account}/insights?${params}`, {
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`Meta Ads ${res.status}`);
  const body = (await res.json()) as { data: MetaRow[] };
  return body.data.map((x) => ({
    date: x.date_start,
    platform: "meta" as const,
    spend: Number(x.spend),
    impressions: Number(x.impressions),
    clicks: Number(x.clicks),
  }));
}
