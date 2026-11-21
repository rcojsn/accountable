import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useDeal, useTimeline, useUpdateDeal } from "../api/hooks";
import type { Stage } from "../api/types";
import { ActivityForm } from "../components/forms/ActivityForm";
import { DealDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { LateBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { inputClass } from "../components/ui/Field";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { useToast } from "../components/ui/Toast";
import { Timeline } from "../components/Timeline";
import { formatDate, money, percent } from "../lib/format";
import { STAGE_NAMES, STAGES } from "../lib/rules";
import { NotFound } from "./NotFound";

export default function DealPage() {
  const id = Number(useParams().id);
  const { data: deal, error } = useDeal(id);
  const timeline = useTimeline("deals", id);
  const update = useUpdateDeal();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error) return <NotFound what="deal" list="/deals" />;
  if (!deal) return <p className="text-ink-muted">Loading…</p>;

  const changeStage = (stage: Stage) =>
    // Only the stage is sent, so the server applies the same rules as a drag (REQ-15).
    update.mutate({ id, stage }, { onSuccess: () => toast(`Moved to ${STAGE_NAMES[stage]}`), onError: (e) => toast(e.message, "error") });

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/deals" className="hover:text-ink">Deals</Link>}
        title={deal.name}
        actions={
          <>
            <Button icon={<Pencil size={15} />} onClick={() => setEditing(true)}>Edit</Button>
            <Button icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>Delete</Button>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-[18px]">
        <div className="space-y-[18px]">
          <Panel>
            <PanelHeader title="Log activity" />
            <ActivityForm inline target={{ deal_id: id }} onSaved={() => {}} />
          </Panel>
          <Panel>
            <PanelHeader title="Timeline" />
            <Timeline entries={timeline.data ?? []} />
          </Panel>
        </div>
        <div className="space-y-[18px]">
          <Panel>
            <PanelHeader title="Details" />
            <dl className="space-y-3.5 text-[14px]">
              <div>
                <dt className="mb-1 text-xs font-semibold text-ink-muted"><label htmlFor="stage-select">Stage</label></dt>
                <dd>
                  <select id="stage-select" className={inputClass} value={deal.stage} disabled={update.isPending} onChange={(e) => changeStage(e.target.value as Stage)}>
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_NAMES[s]}</option>)}
                  </select>
                </dd>
              </div>
              <Row label="Value" mono>{money(deal.value)}</Row>
              <Row label="Probability" mono>{percent(deal.probability)}</Row>
              <Row label="Expected revenue" mono>{money(deal.expected_revenue)}</Row>
              <Row label="Close date" mono>
                {deal.close_date ? (
                  <span className={`inline-flex items-center gap-2 ${deal.is_late ? "font-semibold text-raspberry-strong" : ""}`}>
                    {formatDate(deal.close_date)} {deal.is_late ? <LateBadge /> : null}
                  </span>
                ) : "Not set"}
              </Row>
              <Row label="Organization"><Link className="font-medium text-cerulean-strong hover:underline" to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link></Row>
              <Row label="Main contact">
                {deal.contact_id ? <Link className="font-medium text-cerulean-strong hover:underline" to={`/contacts/${deal.contact_id}`}>{deal.contact_name}</Link> : "None"}
              </Row>
            </dl>
          </Panel>
        </div>
      </div>
      <DealDialog state={editing ? deal : undefined} onClose={() => setEditing(false)} />
      <ConfirmDelete kind="deal" id={deleting ? id : null} name={deal.name} onClose={() => setDeleting(false)} onDeleted={() => navigate("/deals")} />
    </>
  );
}

export function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono text-[13.5px]" : ""}`}>{children}</dd>
    </div>
  );
}
