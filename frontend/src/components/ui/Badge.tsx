import type { ContactStatus, Stage } from "../../api/types";
import { STAGE_STYLE } from "../../lib/stages";

export function StageBadge({ stage, className = "" }: { stage: Stage; className?: string }) {
  const s = STAGE_STYLE[stage];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-px text-[11.5px] font-semibold ${className}`} style={{ background: s.badge, color: s.badgeOn }}>
      {s.name}
    </span>
  );
}

export function LateBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-none rounded-full bg-raspberry-strong px-[7px] py-px text-[10.5px] font-semibold text-white ${className}`}>Late</span>
  );
}

const STATUS: Record<ContactStatus, { label: string; bg: string; fg: string }> = {
  lead: { label: "Lead", bg: "rgba(143,163,170,.28)", fg: "#3B5560" },
  qualified: { label: "Qualified", bg: "rgba(17,138,178,.16)", fg: "#0E6F90" },
  customer: { label: "Customer", bg: "rgba(6,214,160,.22)", fg: "#05795A" },
};
export const STATUS_LABEL: Record<ContactStatus, string> = { lead: "Lead", qualified: "Qualified", customer: "Customer" };

export function StatusBadge({ status }: { status: ContactStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex rounded-full px-2.5 py-px text-[11.5px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
