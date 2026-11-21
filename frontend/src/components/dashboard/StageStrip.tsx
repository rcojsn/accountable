import type { Dashboard } from "../../api/types";
import { money, plural } from "../../lib/format";
import { STAGE_STYLE } from "../../lib/stages";
import { Panel, PanelHeader } from "../ui/Panel";

/** Open pipeline by stage: blocks as wide as their share of open value (REQ-75). */
export function StageStrip({ stages }: { stages: Dashboard["stages"] }) {
  const total = stages.reduce((sum, s) => sum + s.value, 0);
  return (
    <Panel>
      <PanelHeader title="Open pipeline by stage" meta="Width shows value · expected revenue in each block" />
      <div className="flex gap-2">
        {stages.map((s) => {
          const style = STAGE_STYLE[s.stage];
          const bg = s.stage === "negotiation" ? style.badge : style.fill; // darker blue keeps white text readable
          return (
            <div
              key={s.stage}
              data-testid={`strip-${s.stage}`}
              className="flex min-h-[128px] min-w-[150px] flex-col justify-between rounded-2xl px-[18px] pb-4 pt-[18px]"
              style={{ flexGrow: total > 0 ? Math.max(s.value, total * 0.08) : 1, flexBasis: 0, background: bg, color: style.on }}
            >
              <div className="flex justify-between font-semibold">
                <span>{style.name}</span>
                <span className="font-mono text-[13px] font-medium">{plural(s.deal_count, "deal")}</span>
              </div>
              <div>
                <div className="font-mono text-[22px] font-semibold tracking-[-0.02em]">{money(s.value)}</div>
                <div className="text-xs opacity-85">Expected {money(s.expected_revenue)} at {s.probability}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
