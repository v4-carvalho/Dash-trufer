import Link from "next/link";
import { Activity, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Range, RawData } from "@/lib/types";
import { DateRangeFilter } from "./date-range-filter";

const NAV = [
  { href: "/", label: "Aquisição & Tráfego", icon: Activity },
  { href: "/clientes", label: "Sucesso do Cliente", icon: Users },
];
const SOURCES: [keyof RawData["sources"], string][] = [
  ["rdstation", "RD Station CRM"],
  ["meta", "Meta Ads"],
  ["google", "Google Ads"],
  ["ga4", "GA4"],
  ["erp", "ERP Trufer"],
];

export function Shell({ active, title, subtitle, range, sources, children }: {
  active: string;
  title: string;
  subtitle: string;
  range: Range;
  sources: RawData["sources"];
  children: ReactNode;
}) {
  const demo = Object.values(sources).some((s) => s === "demo");
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-[#161616] p-5 md:flex">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-trufer.png" alt="Trufer" className="h-12 w-auto" />
          <div className="mt-2 text-xs text-muted">Dashboard comercial</div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={`${href}?from=${range.from}&to=${range.to}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active === href ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:bg-white/5"}`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-line pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">Fontes de dados</div>
          {SOURCES.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between text-xs text-muted">
              {label}
              <span className={sources[k] === "live" ? "text-good" : "text-google"}>{sources[k] === "live" ? "● ao vivo" : "○ demo"}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
          <DateRangeFilter key={`${range.from}${range.to}`} from={range.from} to={range.to} />
        </header>
        {demo && (
          <div className="mb-6 rounded-xl border border-google/30 bg-google/10 px-4 py-2 text-xs text-google">
            Parte dos dados é de demonstração: as integrações sem chave configurada usam valores simulados.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
