import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { Dashboard } from "../../api/types";
import { monthLabel, monthLabelLong } from "../../lib/format";
import { Panel } from "../ui/Panel";

type Month = Dashboard["months"][number];

function BarTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as Month;
  return (
    <div className="rounded-xl bg-ink px-3.5 py-2.5 text-[12px] text-white shadow-[0_8px_24px_rgba(7,59,76,.3)]">
      <div className="mb-1 opacity-80">{monthLabelLong(m.month)}</div>
      <div>{m.deals_won} won</div>
      <div>{m.deals_lost} lost</div>
    </div>
  );
}

export function WonLostChart({ months }: { months: Dashboard["months"] }) {
  return (
    <Panel>
      <div className="mb-[18px] flex items-center justify-between">
        <h2 className="text-base font-semibold">Deals won and lost</h2>
        <div className="flex gap-3.5 text-xs text-ink-muted">
          <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green align-[-1px]" />Won</span>
          <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-lost align-[-1px]" />Lost</span>
        </div>
      </div>
      <div role="img" aria-label="Bar chart of deals won and lost in each of the last 12 months" className="h-[250px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 420, height: 250 }}>
          <BarChart data={months} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#e6edef" />
            <XAxis dataKey="month" tickFormatter={(k) => monthLabel(k).slice(0, 1)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#4F6B75", fontFamily: "JetBrains Mono" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#4F6B75", fontFamily: "JetBrains Mono" }} />
            <Tooltip content={BarTooltip} cursor={{ fill: "rgba(7,59,76,.05)" }} isAnimationActive={false} />
            <Bar dataKey="deals_won" fill="#06D6A0" radius={[7, 7, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="deals_lost" fill="#8FA3AA" radius={[7, 7, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
