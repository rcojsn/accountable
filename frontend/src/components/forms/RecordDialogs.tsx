import type { Contact, Deal, Organization, Stage } from "../../api/types";
import { Dialog } from "../ui/Dialog";
import { ContactForm } from "./ContactForm";
import { DealForm } from "./DealForm";
import { OrganizationForm } from "./OrganizationForm";

/** `undefined` is closed, `null` is a new record, an object is an edit. */
export function OrganizationDialog({ state, onClose, onSaved }: { state: Organization | null | undefined; onClose: () => void; onSaved?: (o: Organization) => void }) {
  return (
    <Dialog open={state !== undefined} onOpenChange={(o) => !o && onClose()} title={state ? "Edit organization" : "New organization"}>
      {state !== undefined ? (
        <OrganizationForm key={state?.id ?? "new"} initial={state ?? undefined} onCancel={onClose} onSaved={(o) => { onSaved?.(o); onClose(); }} />
      ) : null}
    </Dialog>
  );
}

export function ContactDialog({
  state, organizationId, onClose, onSaved,
}: { state: Contact | null | undefined; organizationId?: number | null; onClose: () => void; onSaved?: (c: Contact) => void }) {
  return (
    <Dialog open={state !== undefined} onOpenChange={(o) => !o && onClose()} title={state ? "Edit contact" : "New contact"}>
      {state !== undefined ? (
        <ContactForm key={state?.id ?? "new"} initial={state ?? undefined} organizationId={organizationId} onCancel={onClose} onSaved={(c) => { onSaved?.(c); onClose(); }} />
      ) : null}
    </Dialog>
  );
}

export function DealDialog({
  state, defaults, onClose, onSaved,
}: {
  state: Deal | null | undefined;
  defaults?: { stage?: Stage; organization_id?: number | null; contact_id?: number | null };
  onClose: () => void;
  onSaved?: (d: Deal) => void;
}) {
  return (
    <Dialog open={state !== undefined} onOpenChange={(o) => !o && onClose()} title={state ? "Edit deal" : "New deal"} wide>
      {state !== undefined ? (
        <DealForm key={state?.id ?? "new"} initial={state ?? undefined} defaults={defaults} onCancel={onClose} onSaved={(d) => { onSaved?.(d); onClose(); }} />
      ) : null}
    </Dialog>
  );
}
