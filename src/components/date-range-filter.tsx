"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// "YYYY-MM-DD" como data local (new Date(iso) seria UTC e recuaria um dia)
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const label = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<DateRange | undefined>({ from: fromIso(from), to: fromIso(to) });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const ready = Boolean(sel?.from);
  const apply = () => {
    if (!sel?.from) return;
    const end = sel.to ?? sel.from;
    router.push(`${pathname}?from=${toIso(sel.from)}&to=${toIso(end)}`);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs hover:border-accent/60"
      >
        <CalendarDays size={14} className="text-accent" />
        {label(fromIso(from))} – {label(fromIso(to))}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-max max-w-[calc(100vw-2rem)] overflow-x-auto rounded-xl border border-line bg-panel2 p-3 shadow-2xl shadow-black/50">
          <DayPicker
            mode="range"
            locale={ptBR}
            selected={sel}
            onSelect={setSel}
            defaultMonth={sel?.from}
            numberOfMonths={2}
            max={366}
            disabled={{ after: new Date() }}
            className="trufer-calendar"
          />
          <div className="mt-2 flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-white">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={apply}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
