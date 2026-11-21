import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useOrganizations } from "../api/hooks";
import type { Organization } from "../api/types";
import { DataTable, type Column } from "../components/DataTable";
import { OrganizationDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { money } from "../lib/format";

const columns: Column<Organization>[] = [
  { id: "name", header: "Name", value: (o) => o.name, cell: (o) => <Link to={`/organizations/${o.id}`} className="font-semibold hover:text-green-text">{o.name}</Link> },
  { id: "industry", header: "Industry", value: (o) => o.industry, cell: (o) => o.industry ?? "" },
  { id: "website", header: "Website", value: (o) => o.website, cell: (o) => o.website ?? "" },
  { id: "contacts", header: "Contacts", align: "right", mono: true, searchable: false, value: (o) => o.contact_count, cell: (o) => o.contact_count },
  { id: "open_deals", header: "Open deals", align: "right", mono: true, searchable: false, value: (o) => o.open_deal_count, cell: (o) => o.open_deal_count },
  { id: "open_value", header: "Open value", align: "right", mono: true, searchable: false, value: (o) => o.open_value, cell: (o) => money(o.open_value) },
];
const getRowId = (o: Organization) => o.id;

export default function Organizations() {
  const { data, isLoading } = useOrganizations();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Organization | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  return (
    <>
      <PageHeader eyebrow="Records" title="Organizations" />
      <DataTable
        data={data ?? []}
        loading={isLoading}
        columns={columns}
        getRowId={getRowId}
        noun="organizations"
        defaultSort={{ id: "name" }}
        onRowClick={(o) => navigate(`/organizations/${o.id}`)}
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setDialog(null)}>New organization</Button>}
        actions={(o) => (
          <>
            <IconButton label={`Edit ${o.name}`} onClick={() => setDialog(o)}><Pencil size={16} /></IconButton>
            <IconButton label={`Delete ${o.name}`} tone="danger" onClick={() => setDeleting(o)}><Trash2 size={16} /></IconButton>
          </>
        )}
      />
      <OrganizationDialog state={dialog} onClose={() => setDialog(undefined)} />
      <ConfirmDelete kind="organization" id={deleting?.id ?? null} name={deleting?.name} onClose={() => setDeleting(null)} />
    </>
  );
}
