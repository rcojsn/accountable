import { BellRing, ClockAlert, Layers, Target } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Dashboard } from "../../api/types";
import { money, plural } from "../../lib/format";

function Tile({ label, icon, figure, note, alert, to, testId }: { label: string; icon: ReactNode; figure: string; note: string; alert?: boolean; to?: string; testId: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between text-[13px] font-medium text-ink-muted">
        {label}
        <span className={`grid h-[34px] w-[34px] place-items-center rounded-full ${alert ? "bg-[rgba(239,71,111,.12)] text-raspberry-strong" : "bg-bg"}`}>{icon}</span>
      </div>
      <div className={`mt-1.5 font-mono text-[28px] font-semibold tracking-[-0.03em] ${alert ? "text-raspberry-strong" : ""}`} data-testid={testId}>{figure}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{note}</div>
    </>
  );
  const cls = "block min-w-0 rounded-[20px] bg-white p-[26px]";
  return to ? <Link to={to} className={`${cls} hover:bg-[#fbfdfd]`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Tiles({ data }: { data: Dashboard }) {
  const h = data.headline;
  return (
    <div className="grid grid-cols-4 gap-[18px]">
      <Tile label="Open pipeline" icon={<Layers size={16} />} figure={money(h.open_value)} note={plural(h.open_deal_count, "open deal")} testId="tile-open" />
      <Tile label="Expected revenue" icon={<Target size={16} />} figure={money(h.expected_revenue)} note="Value × probability of close" testId="tile-expected" />
      <Tile
        label="Late deals" icon={<ClockAlert size={16} />} figure={String(h.late_deals)} note="Open past their close date"
        alert={h.late_deals > 0} to="/deals" testId="tile-late"
      />
      <Tile
        label="Overdue follow-ups" icon={<BellRing size={16} />} figure={String(h.overdue_follow_ups)}
        note={h.due_today_follow_ups > 0 ? `${h.due_today_follow_ups} more due today` : "None due today"}
        alert={h.overdue_follow_ups > 0} to="/#follow-ups" testId="tile-overdue"
      />
    </div>
  );
}
