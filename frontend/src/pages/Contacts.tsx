import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useContacts } from "../api/hooks";
import type { Contact, ContactStatus } from "../api/types";
import { DataTable, type Column } from "../components/DataTable";
import { ContactDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { StatusBadge, STATUS_LABEL } from "../components/ui/Badge";
import { Button, IconButton } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";

const columns: Column<Contact>[] = [
  { id: "name", header: "Name", value: (c) => c.name, cell: (c) => <Link to={`/contacts/${c.id}`} className="font-semibold hover:text-green-text">{c.name}</Link> },
  { id: "status", header: "Status", value: (c) => STATUS_LABEL[c.status], cell: (c) => <StatusBadge status={c.status} /> },
  {
    id: "organization", header: "Organization", value: (c) => c.organization_name,
    cell: (c) => (c.organization_id ? <Link to={`/organizations/${c.organization_id}`} className="hover:text-green-text">{c.organization_name}</Link> : ""),
  },
  { id: "job_title", header: "Job title", value: (c) => c.job_title, cell: (c) => c.job_title ?? "" },
  { id: "email", header: "Email", value: (c) => c.email, cell: (c) => c.email ?? "" },
  { id: "phone", header: "Phone", mono: true, value: (c) => c.phone, cell: (c) => c.phone ?? "" },
];
const getRowId = (c: Contact) => c.id;
const FILTERS: (ContactStatus | "all")[] = ["all", "lead", "qualified", "customer"];

export default function Contacts() {
  const { data, isLoading } = useContacts();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ContactStatus | "all">("all");
  const [dialog, setDialog] = useState<Contact | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const all = data ?? [];
  const counts = useMemo(() => {
    const c = { all: all.length, lead: 0, qualified: 0, customer: 0 };
    for (const x of all) c[x.status]++;
    return c;
  }, [all]);
  const shown = useMemo(() => (status === "all" ? all : all.filter((c) => c.status === status)), [all, status]);

  return (
    <>
      <PageHeader eyebrow="Records" title="Contacts" />
      <DataTable
        data={shown}
        loading={isLoading}
        columns={columns}
        getRowId={getRowId}
        noun="contacts"
        defaultSort={{ id: "name" }}
        onRowClick={(c) => navigate(`/contacts/${c.id}`)}
        toolbar={
          <div role="group" aria-label="Filter by status" className="flex rounded-full bg-bg p-[3px]">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={status === f}
                onClick={() => setStatus(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${status === f ? "bg-white text-ink shadow-[0_1px_2px_rgba(7,59,76,.1)]" : "text-ink-muted"}`}
              >
                {f === "all" ? "All" : STATUS_LABEL[f]} <span className="ml-1 font-mono text-[11px] font-medium">{counts[f]}</span>
              </button>
            ))}
          </div>
        }
        action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setDialog(null)}>New contact</Button>}
        actions={(c) => (
          <>
            <IconButton label={`Edit ${c.name}`} onClick={() => setDialog(c)}><Pencil size={16} /></IconButton>
            <IconButton label={`Delete ${c.name}`} tone="danger" onClick={() => setDeleting(c)}><Trash2 size={16} /></IconButton>
          </>
        )}
      />
      <ContactDialog state={dialog} onClose={() => setDialog(undefined)} />
      <ConfirmDelete kind="contact" id={deleting?.id ?? null} name={deleting?.name} onClose={() => setDeleting(null)} />
    </>
  );
}
