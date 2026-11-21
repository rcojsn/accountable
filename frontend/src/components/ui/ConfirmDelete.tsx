import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { DeleteImpact, DeleteKind } from "../../api/types";
import {
  useDeleteActivity, useDeleteContact, useDeleteDeal, useDeleteImpact, useDeleteOrganization,
} from "../../api/hooks";
import { plural } from "../../lib/format";
import { Button } from "./Button";
import { useToast } from "./Toast";

const KIND_LABEL: Record<DeleteKind, string> = { organization: "organization", contact: "contact", deal: "deal", activity: "activity" };

/** The dialog's wording, with the real counts (REQ-30 to REQ-33). */
export function deleteMessage(kind: DeleteKind, impact: DeleteImpact | undefined, name?: string): { title: string; lines: string[] } {
  if (kind === "activity") return { title: "Delete this activity?", lines: [] };
  const title = `Delete ${impact?.name ?? name ?? `this ${kind}`}?`;
  if (!impact) return { title, lines: [] };
  const lines: string[] = [];
  if (kind === "organization" && "contacts" in impact) {
    if (impact.deals > 0) lines.push(`Its ${plural(impact.deals, "deal")} and their ${plural(impact.activities, "activity", "activities")} will be deleted.`);
    if (impact.contacts > 0) lines.push(`Its ${plural(impact.contacts, "contact")} will be kept, with no organization.`);
    if (lines.length === 0) lines.push("Nothing else is linked to it.");
  } else if (kind === "contact" && "deal_activities" in impact) {
    if (impact.activities > 0) lines.push(`The ${plural(impact.activities, "activity", "activities")} logged on them will be deleted.`);
    if (impact.deals > 0) {
      const kept = impact.deal_activities > 0
        ? ` The ${plural(impact.deal_activities, "activity", "activities")} logged on ${impact.deals === 1 ? "that deal" : "those deals"} will be kept.`
        : "";
      lines.push(`Their ${plural(impact.deals, "deal")} will be kept, with no main contact.${kept}`);
    }
    if (lines.length === 0) lines.push("Nothing else is linked to them.");
  } else if (kind === "deal") {
    lines.push(
      impact.activities > 0
        ? `Its ${plural(impact.activities, "activity", "activities")}, including its stage changes, will be deleted.`
        : "It has no activities.",
    );
  }
  return { title, lines };
}

interface ViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: DeleteKind;
  impact?: DeleteImpact;
  name?: string;
  pending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDeleteView({ open, onOpenChange, kind, impact, name, pending, onConfirm }: ViewProps) {
  const { title, lines } = deleteMessage(kind, impact, name);
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(7,59,76,.38)]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[92vw] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white p-7 shadow-[0_24px_60px_rgba(7,59,76,.25)]">
          <AlertDialog.Title className="text-xl font-semibold tracking-tight">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-3 space-y-2 text-[14px] text-ink-muted">
              {lines.length ? lines.map((l) => <p key={l}>{l}</p>) : <p>{impact || kind === "activity" ? "This can't be undone." : "Checking what is linked…"}</p>}
            </div>
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2.5">
            <AlertDialog.Cancel asChild>
              <Button>Cancel</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" disabled={pending || (kind !== "activity" && !impact)} onClick={onConfirm}>
              Delete {KIND_LABEL[kind]}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

interface Props {
  kind: DeleteKind;
  id: number | null;
  name?: string;
  onClose: () => void;
  onDeleted?: () => void;
}

/** Asks first, with the real counts from the server, then deletes. Open when `id` is set. */
export function ConfirmDelete({ kind, id, name, onClose, onDeleted }: Props) {
  const toast = useToast();
  const impact = useDeleteImpact(kind, id);
  const delOrg = useDeleteOrganization();
  const delContact = useDeleteContact();
  const delDeal = useDeleteDeal();
  const delActivity = useDeleteActivity();
  const mutation = { organization: delOrg, contact: delContact, deal: delDeal, activity: delActivity }[kind];

  const confirm = () => {
    if (id === null) return;
    mutation.mutate(id, {
      onSuccess: () => {
        toast(`${KIND_LABEL[kind][0].toUpperCase()}${KIND_LABEL[kind].slice(1)} deleted`);
        onClose();
        onDeleted?.();
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <ConfirmDeleteView
      open={id !== null}
      onOpenChange={(o) => !o && onClose()}
      kind={kind}
      impact={impact.data}
      name={name}
      pending={mutation.isPending}
      onConfirm={confirm}
    />
  );
}
