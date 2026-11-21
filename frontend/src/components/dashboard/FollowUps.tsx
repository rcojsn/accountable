import { Link } from "react-router";
import type { Activity, Dashboard } from "../../api/types";
import { formatDateShort } from "../../lib/format";
import { FollowUpCheck } from "../FollowUpCheck";
import { TypeIcon } from "../Timeline";
import { Panel } from "../ui/Panel";

function Task({ a, tone, today }: { a: Activity; tone: "late" | "today" | "plain"; today: string }) {
  const chip = tone === "late" ? "bg-raspberry-strong text-white font-semibold" : tone === "today" ? "bg-marigold text-ink font-semibold" : "bg-white";
  return (
    <li className="mb-2 grid grid-cols-[22px_1fr_auto_auto] items-center gap-3.5 rounded-[14px] bg-bg px-3.5 py-3" data-testid="follow-up">
      <FollowUpCheck activity={a} />
      <div className="min-w-0">
        <div className="truncate font-medium">{a.description}</div>
        <div className="text-xs text-ink-muted">
          {a.deal_id ? (
            <>Deal · <Link to={`/deals/${a.deal_id}`} className="hover:text-ink hover:underline">{a.deal_name}</Link></>
          ) : (
            <>Contact · <Link to={`/contacts/${a.contact_id}`} className="hover:text-ink hover:underline">{a.contact_name}</Link></>
          )}
        </div>
      </div>
      <span className="text-ink-muted"><TypeIcon type={a.type} /></span>
      <span className={`whitespace-nowrap rounded-full px-2.5 py-[3px] font-mono text-[11.5px] ${chip}`}>{formatDateShort(a.follow_up_date!, today)}</span>
    </li>
  );
}

export function FollowUps({ data }: { data: Dashboard }) {
  const f = data.follow_ups;
  const none = f.overdue.length + f.today.length + f.next_7_days.length === 0;
  const groups: { key: string; title: string; items: Activity[]; tone: "late" | "today" | "plain"; head?: string }[] = [
    { key: "overdue", title: "Overdue", items: f.overdue, tone: "late", head: "text-raspberry-strong" },
    { key: "today", title: "Today", items: f.today, tone: "today" },
    { key: "next", title: "Next 7 days", items: f.next_7_days, tone: "plain" },
  ];
  return (
    <Panel id="follow-ups" className="scroll-mt-6">
      <div className="mb-[18px] flex items-center justify-between">
        <h2 className="text-base font-semibold">Follow-ups</h2>
        <span className="text-xs text-ink-muted" data-testid="later-count">{f.later_count > 0 ? `${f.later_count} more later` : "None later"}</span>
      </div>
      {none ? <p className="py-4 text-ink-muted">No follow-ups are due in the next 7 days.</p> : null}
      {groups.map((g) =>
        g.items.length > 0 ? (
          <div key={g.key} data-testid={`followups-${g.key}`}>
            <div className={`mb-2 mt-3.5 text-xs font-semibold first:mt-0 ${g.head ?? "text-ink-muted"}`}>{g.title} · {g.items.length}</div>
            <ul>{g.items.map((a) => <Task key={a.id} a={a} tone={g.tone} today={data.today} />)}</ul>
          </div>
        ) : null,
      )}
    </Panel>
  );
}
