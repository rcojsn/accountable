import type { Dashboard } from "../../api/types";
import { moneyShort, plural } from "../../lib/format";
import { STAGE_STYLE } from "../../lib/stages";
import { Panel, PanelHeader } from "../ui/Panel";

/** Value and deals that reached each stage (REQ-74). */
export function Funnel({ funnel }: { funnel: Dashboard["funnel"] }) {
  const max = Math.max(...funnel.map((f) => f.value), 1);
  return (
    <Panel>
      <PanelHeader title="Sales funnel" meta="Value that reached each stage, deals created in the last 12 months" />
      <div>
        {funnel.map((f, i) => {
          const style = STAGE_STYLE[f.stage];
          const prev = funnel[i - 1];
          return (
            <div key={f.stage}>
              {prev && prev.deal_count > 0 ? (
                <div className="py-0.5 pl-[120px] font-mono text-[11px] text-ink-muted">↓ {Math.round((f.deal_count / prev.deal_count) * 100)}% moved on</div>
              ) : null}
              <div className="grid grid-cols-[104px_1fr_84px_72px] items-center gap-3.5 py-[7px]" data-testid={`funnel-${f.stage}`}>
                <span className="flex items-center gap-2 font-semibold">
                  <i className="h-2 w-2 flex-none rounded-full" style={{ background: style.fill }} />
                  {style.name}
                </span>
                <div className="h-3.5 overflow-hidden rounded-full bg-bg">
                  <span className="block h-full rounded-full" style={{ width: `${(f.value / max) * 100}%`, background: style.fill }} />
                </div>
                <span className="text-right font-mono font-semibold">{moneyShort(f.value)}</span>
                <span className="text-right font-mono text-xs text-ink-muted">{plural(f.deal_count, "deal")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
