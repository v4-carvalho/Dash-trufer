import { Shell } from "@/components/shell";
import { Bar, Card, Kpi } from "@/components/ui";
import { SpendLeadsChart } from "@/components/charts";
import { getRawData, resolveRange } from "@/lib/data";
import { acquisition } from "@/lib/metrics";
import { brl, int, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Aquisicao(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const range = resolveRange(sp);
  const raw = await getRawData(range);
  const m = acquisition(raw, range);
  const f = m.funnel;

  const steps = [
    { label: "Leads recebidos", n: f.leads, rate: null as string | null, w: 1 },
    { label: "MQL (qualificados)", n: f.mql, rate: pct(f.mqlRate), w: f.mqlRate },
    { label: "SQL (em negociação)", n: f.sql, rate: pct(f.sqlRate) + " dos MQL", w: f.leads ? f.sql / f.leads : 0 },
    { label: "Vendas fechadas", n: f.won, rate: pct(f.winRate) + " dos SQL", w: f.leads ? f.won / f.leads : 0 },
  ];

  return (
    <Shell active="/" title="Aquisição & Tráfego" subtitle={`Novo cliente · ${range.from.split("-").reverse().join("/")} a ${range.to.split("-").reverse().join("/")}`} range={range} sources={raw.sources}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Investimento total" value={brl(m.spend, true)} sub={`Meta ${brl(m.spendMeta, true)} · Google ${brl(m.spendGoogle, true)}`} />
        <Kpi label="CPL global" value={brl(m.cpl)} sub={`${int(f.leads)} leads`} />
        <Kpi label="Custo por MQL" value={brl(m.costPerMql)} sub={`${int(f.mql)} MQL`} />
        <Kpi label="Custo por venda" value={brl(m.costPerSale)} sub={`${int(f.won)} vendas · ${brl(m.wonRevenue, true)}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Investimento × leads por dia" className="lg:col-span-2">
          <SpendLeadsChart data={m.daily} />
        </Card>
        <Card title="Funil de captação">
          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="font-semibold">
                    {int(s.n)} {s.rate && <span className="ml-1 text-xs font-normal text-muted">{s.rate}</span>}
                  </span>
                </div>
                <Bar value={s.w} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Mídia paga" hint="Meta + Google">
          <dl className="space-y-3 text-sm">
            {[
              ["Impressões", int(m.impressions)],
              ["Cliques", int(m.clicks)],
              ["CTR", pct(m.ctr, 2)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Landing page" hint="GA4">
          <dl className="space-y-3 text-sm">
            {[
              ["Sessões", int(m.landing.sessions)],
              ["Tempo de tela médio", `${Math.round(m.landing.avgEngagementSec)}s`],
              ["Envios de formulário", int(m.landing.submits)],
              ["Conversão da página", pct(m.landing.conversion, 2)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Qualidade da base" hint="Motivos de perda no CRM">
          {m.lostReasons.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma perda registrada no período.</p>
          ) : (
            <ul className="space-y-3">
              {m.lostReasons.map((r) => (
                <li key={r.reason}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{r.reason}</span>
                    <span className="text-muted">
                      {r.count} · {pct(r.share, 0)}
                    </span>
                  </div>
                  <Bar value={r.share} color="var(--bad)" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
