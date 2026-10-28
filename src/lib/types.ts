export type Platform = "meta" | "google";

export interface AdsDaily {
  date: string; // YYYY-MM-DD
  platform: Platform;
  spend: number;
  impressions: number;
  clicks: number;
}

export type DealStage = "lead" | "mql" | "sql" | "won" | "lost";

export interface Deal {
  id: string;
  createdAt: string;
  /** Estágio mais avançado alcançado pelo lead no funil */
  reached: Exclude<DealStage, "lost">;
  lost: boolean;
  lostReason?: string;
  amount: number;
}

export interface Ga4Daily {
  date: string;
  sessions: number;
  avgEngagementSec: number;
  formSubmits: number;
}

export interface ErpOrder {
  customerId: string;
  customerName: string;
  date: string;
  tons: number;
  value: number;
}

export type SourceStatus = "live" | "demo";

export interface RawData {
  ads: AdsDaily[];
  deals: Deal[];
  ga4: Ga4Daily[];
  orders: ErpOrder[];
  sources: Record<"rdstation" | "meta" | "google" | "ga4" | "erp", SourceStatus>;
}

export interface Range {
  from: string;
  to: string;
  days: number;
}
