import { ArrowRight, Mail, Pencil, Phone, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { Activity, ActivityType } from "../api/types";
import { formatDateShort, formatDateTime } from "../lib/format";
import { followUpState, todayIso } from "../lib/rules";
import { FollowUpCheck } from "./FollowUpCheck";
import { ActivityForm } from "./forms/ActivityForm";
import { IconButton } from "./ui/Button";
import { StageBadge } from "./ui/Badge";
import { ConfirmDelete } from "./ui/ConfirmDelete";
import { Dialog } from "./ui/Dialog";

export const TYPE_LABEL: Record<ActivityType, string> = { note: "Note", call: "Call", email: "Email", stage_change: "Stage change" };
export function TypeIcon({ type, size = 16 }: { type: ActivityType; size?: number }) {
  const Icon = { note: StickyNote, call: Phone, email: Mail, stage_change: ArrowRight }[type];
  return <Icon size={size} aria-hidden="true" />;
}

export function FollowUpChip({ activity, today }: { activity: Activity; today: string }) {
  if (!activity.follow_up_date) return null;
  const state = followUpState(activity.follow_up_date, activity.done, today);
  const style =
    state === "overdue" ? "bg-raspberry-strong text-white font-semibold" : state === "done" ? "bg-bg text-ink-muted line-through" : "bg-bg text-ink";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11.5px] ${style}`}>
      Follow up {formatDateShort(activity.follow_up_date, today)}
    </span>
  );
}

interface Props {
  entries: Activity[];
  /** On a contact's page, entries from their deals say which deal (REQ-55). */
  showDeal?: boolean;
}

export function Timeline({ entries, showDeal }: Props) {
  const today = todayIso();
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  if (entries.length === 0) return <p className="py-6 text-center text-ink-muted">Nothing logged yet.</p>;

  return (
    <>
      <ol className="relative space-y-1">
        {entries.map((a) => {
          const stage = a.type === "stage_change";
          return (
            <li key={a.id} className="group flex gap-3.5 rounded-2xl px-2 py-3 hover:bg-[#f7fafb]" data-testid="timeline-entry">
              <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-bg text-ink-muted"><TypeIcon type={a.type} /></span>
              <div className="min-w-0 flex-1">
                {stage ? (
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="sr-only">{a.description}</span>
                    Moved from {a.from_stage ? <StageBadge stage={a.from_stage} /> : null}
                    <ArrowRight size={13} aria-hidden="true" className="text-ink-muted" />
                    {a.to_stage ? <StageBadge stage={a.to_stage} /> : null}
                  </p>
                ) : (
                  <p className="font-medium">{a.description}</p>
                )}
                <p className="mt-0.5 text-xs text-ink-muted">
                  {TYPE_LABEL[a.type]} · <span className="font-mono">{formatDateTime(a.happened_at, today)}</span>
                  {showDeal && a.deal_id ? (
                    <>
                      {" "}· on <Link to={`/deals/${a.deal_id}`} className="font-medium text-cerulean-strong hover:underline">{a.deal_name}</Link>
                    </>
                  ) : null}
                </p>
                {a.follow_up_date ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <FollowUpCheck activity={a} />
                    <FollowUpChip activity={a} today={today} />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-none items-start gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {!stage ? (
                  <IconButton label={`Edit ${TYPE_LABEL[a.type].toLowerCase()}: ${a.description}`} onClick={() => setEditing(a)}><Pencil size={15} /></IconButton>
                ) : null}
                <IconButton label={`Delete ${stage ? "stage change" : TYPE_LABEL[a.type].toLowerCase()}: ${a.description}`} tone="danger" onClick={() => setDeleting(a.id)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title="Edit activity" wide>
        {editing ? <ActivityForm key={editing.id} initial={editing} onCancel={() => setEditing(null)} onSaved={() => setEditing(null)} /> : null}
      </Dialog>
      <ConfirmDelete kind="activity" id={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
