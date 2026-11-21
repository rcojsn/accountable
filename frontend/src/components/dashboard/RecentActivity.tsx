import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import type { Dashboard } from "../../api/types";
import { relativeTime } from "../../lib/format";
import { STAGE_STYLE } from "../../lib/stages";
import { TYPE_LABEL } from "../Timeline";
import { StageBadge } from "../ui/Badge";
import { Panel, PanelHeader } from "../ui/Panel";

export function RecentActivity({ items }: { items: Dashboard["recent_activity"] }) {
  const now = new Date();
  return (
    <Panel>
      <PanelHeader title="Recent activity" meta={`Latest ${items.length}`} />
      {items.length === 0 ? <p className="text-ink-muted">Nothing has happened yet.</p> : null}
      <ol className="relative pl-[26px] before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:rounded before:bg-bg before:content-['']">
        {items.map((a) => {
          const dot = a.type === "stage_change" && a.to_stage ? STAGE_STYLE[a.to_stage].fill : "#B5C4C9";
          return (
            <li key={a.id} className="relative pb-[18px]" data-testid="recent-entry">
              <span className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-white" style={{ boxShadow: `inset 0 0 0 3px ${dot}` }} />
              <div className="font-medium">
                {a.type === "stage_change" && a.from_stage && a.to_stage ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="sr-only">{a.description}</span>
                    <StageBadge stage={a.from_stage} />
                    <ArrowRight size={13} aria-hidden="true" className="text-ink-muted" />
                    <StageBadge stage={a.to_stage} />
                  </span>
                ) : (
                  a.description
                )}
              </div>
              <div className="text-xs text-ink-muted">
                {TYPE_LABEL[a.type]} ·{" "}
                {a.deal_id ? (
                  <Link to={`/deals/${a.deal_id}`} className="hover:text-ink hover:underline">{a.deal_name}</Link>
                ) : (
                  <Link to={`/contacts/${a.contact_id}`} className="hover:text-ink hover:underline">{a.contact_name}</Link>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[11.5px] text-ink-muted">{relativeTime(a.happened_at, now)}</div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
