"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl, int, shortDate } from "@/lib/format";

const ORANGE = "#f26a1b";
const GREEN = "#34c77b";

const axisTick = { fontSize: 11, fill: "#6b6b6b" };
const DRAW_MS = 1400;

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { name?: string | number; value?: unknown; color?: string }[];
}

function makeTooltip(title: (l: string) => string, fmt: (name: string, v: number) => string) {
  return function ChartTip({ active, payload, label }: TipProps) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-line bg-panel2 p-3 shadow-xl shadow-black/40">
        <div className="mb-1.5 text-xs text-muted">{title(String(label))}</div>
        <div className="space-y-1">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-sm">
              <span className="size-2 rounded-full" style={{ background: p.color }} />
              <span className="text-muted">{p.name}</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums">{fmt(String(p.name ?? ""), Number(p.value))}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
}

/** Defs compartilhados: gradiente de área, brilho da linha e fundo de pontos. */
function Defs({ id, colors }: { id: string; colors: string[] }) {
  return (
    <defs>
      {colors.map((c, i) => (
        <g key={c}>
          <linearGradient id={`${id}-area${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.28} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
          <filter id={`${id}-glow${i}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={c} floodOpacity={0.7} />
          </filter>
        </g>
      ))}
      <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1" fill="#fff" fillOpacity={0.06} />
      </pattern>
    </defs>
  );
}

const grid = <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,.09)" vertical={false} />;
const cursor = { stroke: "#8a8a8a", strokeOpacity: 0.5, strokeDasharray: "3 3" };

export function SpendLeadsChart({ data }: { data: { date: string; spend: number; leads: number }[] }) {
  const id = useId().replace(/:/g, "");
  const Tip = makeTooltip(shortDate, (n, v) => (n === "Investimento" ? brl(v) : int(v)));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
        <Defs id={id} colors={[ORANGE, GREEN]} />
        <rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-grid)`} style={{ pointerEvents: "none" }} />
        {grid}
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisTick} axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} />
        <YAxis yAxisId="l" tick={axisTick} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `R$${Math.round(v)}`} />
        <YAxis yAxisId="r" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={Tip} cursor={cursor} />
        <Area
          yAxisId="l" type="monotone" dataKey="spend" name="Investimento"
          stroke={ORANGE} strokeWidth={2} fill={`url(#${id}-area0)`}
          dot={false} activeDot={{ r: 5, fill: ORANGE, stroke: "#fff", strokeWidth: 2 }}
          animationDuration={DRAW_MS} animationEasing="ease-out"
        />
        <Line
          yAxisId="r" type="monotone" dataKey="leads" name="Leads"
          stroke={GREEN} strokeWidth={2.5} filter={`url(#${id}-glow1)`}
          dot={false}
          activeDot={{ r: 5.5, fill: GREEN, stroke: "#fff", strokeWidth: 2 }}
          animationDuration={DRAW_MS} animationBegin={200} animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TonsChart({ data }: { data: { month: string; tons: number }[] }) {
  const id = useId().replace(/:/g, "");
  const label = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`;
  const Tip = makeTooltip(label, (_, v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
        <Defs id={id} colors={[ORANGE]} />
        <rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-grid)`} style={{ pointerEvents: "none" }} />
        {grid}
        <XAxis dataKey="month" tickFormatter={label} tick={axisTick} axisLine={false} tickLine={false} tickMargin={12} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}t`} />
        <Tooltip content={Tip} cursor={cursor} />
        <Area
          type="monotone" dataKey="tons" name="Toneladas"
          stroke={ORANGE} strokeWidth={2.5} fill={`url(#${id}-area0)`} filter={`url(#${id}-glow0)`}
          dot={false}
          activeDot={{ r: 5.5, fill: ORANGE, stroke: "#fff", strokeWidth: 2 }}
          animationDuration={DRAW_MS} animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
