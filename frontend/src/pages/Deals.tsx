import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDeals } from "../api/hooks";
import type { Deal, Stage } from "../api/types";
import { DataTable, type Column } from "../components/DataTable";
import { DealDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { LateBadge, StageBadge } from "../components/ui/Badge";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { formatDate, money, percent } from "../lib/format";
import { STAGE_NAMES, STAGES } from "../lib/rules";

const columns: Column<Deal>[] = [
  { id: "name", header: "Name", value: (d) => d.name, cell: (d) => <Link to={`/deals/${d.id}`} className="font-semibold hover:text-green-text">{d.name}</Link> },
  {
    id: "organization", header: "Organization", value: (d) => d.organization_name,
    cell: (d) => <Link to={`/organizations/${d.organization_id}`} className="hover:text-green-text">{d.organization_name}</Link>,
  },
  {
    id: "contact", header: "Main contact", value: (d) => d.contact_name,
    cell: (d) => (d.contact_id ? <Link to={`/contacts/${d.contact_id}`} className="hover:text-green-text">{d.contact_name}</Link> : ""),
  },
  { id: "stage", header: "Stage", value: (d) => STAGES.indexOf(d.stage), search: (d) => d.stage, cell: (d) => <StageBadge stage={d.stage} /> },
  { id: "value", header: "Value", align: "right", mono: true, searchable: false, value: (d) => d.value, cell: (d) => money(d.value) },
  { id: "probability", header: "Probability", align: "right", mono: true, searchable: false, value: (d) => d.probability, cell: (d) => percent(d.probability) },
  { id: "expected", header: "Expected revenue", align: "right", mono: true, searchable: false, value: (d) => d.expected_revenue, cell: (d) => money(d.expected_revenue) },
  {
    id: "close_date", header: "Close date", mono: true, value: (d) => d.close_date, search: (d) => (d.close_date ? formatDate(d.close_date) : ""),
    cell: (d) =>
      d.close_date ? (
        <span className={`inline-flex items-center gap-2 whitespace-nowrap ${d.is_late ? "font-semibold text-raspberry-strong" : ""}`}>
          {formatDate(d.close_date)}
          {d.is_late ? <LateBadge /> : null}
        </span>
      ) : (
        ""
      ),
  },
];
const getRowId = (d: Deal) => d.id;

export default function Deals() {
  const { data, isLoading } = useDeals();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage | "all">("all");
  const shown = useMemo(() => (stage === "all" ? (data ?? []) : (data ?? []).filter((d) => d.stage === stage)), [data, stage]);
  const [dialog, setDialog] = useState<Deal | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Deal | null>(null);

  return (
    <>
      <PageHeader eyebrow="Records" title="Deals" />
      <DataTable
        data={shown}
        loading={isLoading}
        columns={columns}
        getRowId={getRowId}
        noun="deals"
        defaultSort={{ id: "close_date" }}
        onRowClick={(d) => navigate(`/deals/${d.id}`)}
        toolbar={
          <select aria-label="Filter by stage" value={stage} onChange={(e) => setStage(e.target.value as Stage | "all")} className="rounded-full bg-bg px-4 py-2.5 text-[14px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-cerulean-strong">
            <option value="all">All stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_NAMES[s]}</option>)}
          </select>
        }
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setDialog(null)}>New deal</Button>}
        actions={(d) => (
          <>
            <IconButton label={`Edit ${d.name}`} onClick={() => setDialog(d)}><Pencil size={16} /></IconButton>
            <IconButton label={`Delete ${d.name}`} tone="danger" onClick={() => setDeleting(d)}><Trash2 size={16} /></IconButton>
          </>
        )}
      />
      <DealDialog state={dialog} onClose={() => setDialog(undefined)} />
      <ConfirmDelete kind="deal" id={deleting?.id ?? null} name={deleting?.name} onClose={() => setDeleting(null)} />
    </>
  );
}
