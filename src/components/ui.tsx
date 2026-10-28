import type { ReactNode } from "react";

export function Card({ title, hint, children, className = "" }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel p-5 ${className}`}>
      {title && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "good" }) {
  const color = tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "";
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Bar({ value, color = "var(--accent)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
    </div>
  );
}
