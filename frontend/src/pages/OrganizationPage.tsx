import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useOrganization } from "../api/hooks";
import { ContactDialog, DealDialog, OrganizationDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { LateBadge, StageBadge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { money } from "../lib/format";
import { NotFound } from "./NotFound";

export default function OrganizationPage() {
  const id = Number(useParams().id);
  const { data: org, error } = useOrganization(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [newDeal, setNewDeal] = useState(false);

  if (error) return <NotFound what="organization" list="/organizations" />;
  if (!org) return <p className="text-ink-muted">Loading…</p>;

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/organizations" className="hover:text-ink">Organizations</Link>}
        title={org.name}
        actions={
          <>
            <Button icon={<Pencil size={15} />} onClick={() => setEditing(true)}>Edit</Button>
            <Button icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>Delete</Button>
          </>
        }
      />
      <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-[18px]">
        <Panel className="self-start">
          <PanelHeader title="Details" />
          <dl className="space-y-3.5 text-[14px]">
            <div><dt className="text-xs font-semibold text-ink-muted">Industry</dt><dd className="mt-0.5">{org.industry ?? "Not set"}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-muted">Website</dt><dd className="mt-0.5">{org.website ?? "Not set"}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-muted">Open deals</dt><dd className="mt-0.5 font-mono text-[13.5px]">{org.open_deal_count} · {money(org.open_value)}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-muted">Notes</dt><dd className="mt-0.5 whitespace-pre-wrap">{org.notes ?? "None"}</dd></div>
          </dl>
        </Panel>
        <div className="space-y-[18px]">
          <Panel>
            <PanelHeader title="Contacts" meta={String(org.contacts.length)}>
              <Button className="!py-1.5" icon={<Plus size={15} />} onClick={() => setNewContact(true)}>New contact</Button>
            </PanelHeader>
            {org.contacts.length === 0 ? (
              <p className="text-ink-muted">No contacts yet.</p>
            ) : (
              <ul className="space-y-2">
                {org.contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3.5 py-3">
                    <div className="min-w-0">
                      <Link to={`/contacts/${c.id}`} className="font-semibold hover:text-green-text">{c.name}</Link>
                      {c.job_title ? <div className="text-xs text-ink-muted">{c.job_title}</div> : null}
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Deals" meta={String(org.deals.length)}>
              <Button className="!py-1.5" icon={<Plus size={15} />} onClick={() => setNewDeal(true)}>New deal</Button>
            </PanelHeader>
            {org.deals.length === 0 ? (
              <p className="text-ink-muted">No deals yet.</p>
            ) : (
              <ul className="space-y-2">
                {org.deals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3.5 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link to={`/deals/${d.id}`} className="truncate font-semibold hover:text-green-text">{d.name}</Link>
                      {d.is_late ? <LateBadge /> : null}
                    </div>
                    <div className="flex flex-none items-center gap-3">
                      <span className="font-mono text-[12.5px]">{money(d.value)}</span>
                      <StageBadge stage={d.stage} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <OrganizationDialog state={editing ? org : undefined} onClose={() => setEditing(false)} />
      <ContactDialog state={newContact ? null : undefined} organizationId={id} onClose={() => setNewContact(false)} />
      <DealDialog state={newDeal ? null : undefined} defaults={{ organization_id: id }} onClose={() => setNewDeal(false)} />
      <ConfirmDelete kind="organization" id={deleting ? id : null} name={org.name} onClose={() => setDeleting(false)} onDeleted={() => navigate("/organizations")} />
    </>
  );
}
