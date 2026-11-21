import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { Dashboard } from "../../api/types";
import { money, moneyShort, monthLabel, monthLabelLong, plural } from "../../lib/format";
import { Panel } from "../ui/Panel";

type Month = Dashboard["months"][number];

function RevenueTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as Month;
  return (
    <div className="rounded-xl bg-ink px-3.5 py-2.5 text-white shadow-[0_8px_24px_rgba(7,59,76,.3)]">
      <div className="text-[11px] opacity-80">{monthLabelLong(m.month)}</div>
      <div className="font-mono text-[15px] font-semibold">{money(m.revenue_won)}</div>
      <div className="text-[11px] opacity-80">{plural(m.deals_won, "deal")} won</div>
    </div>
  );
}

export function RevenuePanel({ data }: { data: Dashboard }) {
  const { twelve_months: t, headline: h, months } = data;
  return (
    <Panel className="grid grid-cols-[250px_1fr] gap-7">
      <div>
        <div>
          <div className="text-[13px] font-medium text-ink-muted">Revenue won, last 12 months</div>
          <div className="mt-1.5 font-mono text-[34px] font-semibold tracking-[-0.03em]" data-testid="revenue-12m">{money(t.revenue_won)}</div>
          <div className="mt-1 text-[13px] text-ink-muted">{t.deals_won} deals won · {t.deals_lost} lost</div>
        </div>
        <div className="mt-[26px]">
          <div className="text-[13px] font-medium text-ink-muted">Won this month</div>
          <div className="mt-1 font-mono text-[22px] font-semibold" data-testid="won-this-month">{money(h.won_this_month_revenue)}</div>
          <div className="mt-1 text-[13px] text-ink-muted">{plural(h.won_this_month_count, "deal")}</div>
        </div>
      </div>
      <div role="img" aria-label="Line chart of revenue won in each of the last 12 months" className="h-[290px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 290 }}>
          <AreaChart data={months} margin={{ top: 28, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e6edef" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#4F6B75", fontFamily: "JetBrains Mono" }} />
            <YAxis tickFormatter={moneyShort} width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#4F6B75", fontFamily: "JetBrains Mono" }} />
            <Tooltip content={RevenueTooltip} cursor={{ stroke: "#073B4C", strokeDasharray: "4 4" }} isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="revenue_won"
              stroke="#073B4C"
              strokeWidth={2.5}
              fill="#073B4C"
              fillOpacity={0.05}
              dot={{ r: 4.5, fill: "#06D6A0", stroke: "#073B4C", strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: "#06D6A0", stroke: "#073B4C", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
