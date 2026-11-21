import { Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useContact, useTimeline } from "../api/hooks";
import { ActivityForm } from "../components/forms/ActivityForm";
import { ContactDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { LateBadge, StageBadge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDelete } from "../components/ui/ConfirmDelete";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { Timeline } from "../components/Timeline";
import { money } from "../lib/format";
import { NotFound } from "./NotFound";

export default function ContactPage() {
  const id = Number(useParams().id);
  const { data: contact, error } = useContact(id);
  const timeline = useTimeline("contacts", id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error) return <NotFound what="contact" list="/contacts" />;
  if (!contact) return <p className="text-ink-muted">Loading…</p>;

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/contacts" className="hover:text-ink">Contacts</Link>}
        title={contact.name}
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
            <ActivityForm inline target={{ contact_id: id }} onSaved={() => {}} />
          </Panel>
          <Panel>
            <PanelHeader title="Timeline" />
            <Timeline entries={timeline.data ?? []} showDeal />
          </Panel>
        </div>
        <div className="space-y-[18px]">
          <Panel>
            <PanelHeader title="Details" />
            <dl className="space-y-3.5 text-[14px]">
              <div><dt className="text-xs font-semibold text-ink-muted">Status</dt><dd className="mt-1"><StatusBadge status={contact.status} /></dd></div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">Organization</dt>
                <dd className="mt-0.5">
                  {contact.organization_id ? <Link className="font-medium text-cerulean-strong hover:underline" to={`/organizations/${contact.organization_id}`}>{contact.organization_name}</Link> : "None"}
                </dd>
              </div>
              {contact.job_title ? <div><dt className="text-xs font-semibold text-ink-muted">Job title</dt><dd className="mt-0.5">{contact.job_title}</dd></div> : null}
              {contact.email ? (
                <div><dt className="text-xs font-semibold text-ink-muted">Email</dt><dd className="mt-0.5 flex items-center gap-1.5"><Mail size={14} className="text-ink-muted" />{contact.email}</dd></div>
              ) : null}
              {contact.phone ? (
                <div><dt className="text-xs font-semibold text-ink-muted">Phone</dt><dd className="mt-0.5 flex items-center gap-1.5 font-mono text-[13.5px]"><Phone size={14} className="text-ink-muted" />{contact.phone}</dd></div>
              ) : null}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Deals" meta={`${contact.deals.length} as main contact`} />
            {contact.deals.length === 0 ? (
              <p className="text-ink-muted">Not the main contact on any deal.</p>
            ) : (
              <ul className="space-y-2">
                {contact.deals.map((d) => (
                  <li key={d.id} className="rounded-xl bg-bg px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/deals/${d.id}`} className="font-semibold hover:text-green-text">{d.name}</Link>
                      {d.is_late ? <LateBadge /> : null}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
                      <StageBadge stage={d.stage} />
                      <span className="font-mono text-[12.5px] text-ink">{money(d.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <ContactDialog state={editing ? contact : undefined} onClose={() => setEditing(false)} />
      <ConfirmDelete kind="contact" id={deleting ? id : null} name={contact.name} onClose={() => setDeleting(false)} onDeleted={() => navigate("/contacts")} />
    </>
  );
}
