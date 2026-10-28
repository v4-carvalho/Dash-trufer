import { Shell } from "@/components/shell";
import { Card, Kpi } from "@/components/ui";
import { TonsChart } from "@/components/charts";
import { getRawData, resolveRange } from "@/lib/data";
import { customers } from "@/lib/metrics";
import { brl, int, tons } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Clientes(props: PageProps<"/clientes">) {
  const sp = await props.searchParams;
  const range = resolveRange(sp);
  const raw = await getRawData(range);
  const m = customers(raw, range);

  return (
    <Shell active="/clientes" title="Sucesso do Cliente & Recorrência" subtitle={`Carteira ativa · RD Station + ERP · ${range.from.split("-").reverse().join("/")} a ${range.to.split("-").reverse().join("/")}`} range={range} sources={raw.sources}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Volume transacionado" value={tons(m.tons)} sub={`${int(m.orders)} pedidos · ${int(m.activeCustomers)} clientes`} />
        <Kpi label="Ticket médio" value={brl(m.ticket, true)} sub={`Faturamento ${brl(m.revenue, true)}`} />
        <Kpi label="Frequência de recompra" value={`${m.avgFrequencyDays} dias`} sub={`LTV médio ${brl(m.avgLtv, true)}`} />
        <Kpi
          label="Carteira esfriando"
          value={`${m.cooling.length} clientes`}
          sub={`de ${m.rows.length} na carteira`}
          tone={m.cooling.length ? "bad" : "good"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Toneladas por mês" hint="Últimos 12 meses" className="lg:col-span-2">
          <TonsChart data={m.monthly} />
        </Card>
        <Card title="Alerta de churn" hint="Sem compra além da cadência">
          {m.cooling.length === 0 ? (
            <p className="text-sm text-muted">Toda a carteira está dentro da cadência habitual.</p>
          ) : (
            <ul className="space-y-3">
              {m.cooling.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-xs text-muted">compra a cada ~{c.avgIntervalDays} dias</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad">{c.daysSinceLast}d sem comprar</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recorrência e LTV por cliente" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 text-right font-medium">Pedidos</th>
                <th className="pb-2 text-right font-medium">Toneladas</th>
                <th className="pb-2 text-right font-medium">Cadência</th>
                <th className="pb-2 text-right font-medium">Última compra</th>
                <th className="pb-2 text-right font-medium">LTV</th>
              </tr>
            </thead>
            <tbody>
              {m.rows.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-right">{c.orders}</td>
                  <td className="py-2.5 text-right">{tons(c.tons)}</td>
                  <td className="py-2.5 text-right">{c.avgIntervalDays}d</td>
                  <td className={`py-2.5 text-right ${c.cooling ? "font-semibold text-bad" : ""}`}>há {c.daysSinceLast}d</td>
                  <td className="py-2.5 text-right">{brl(c.ltv, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
