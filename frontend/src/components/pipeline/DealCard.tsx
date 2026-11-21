import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, ClockAlert } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router";
import type { Deal } from "../../api/types";
import { formatDateShort, initials, money, percent } from "../../lib/format";
import { isLate } from "../../lib/rules";
import { STAGE_STYLE } from "../../lib/stages";
import { LateBadge } from "../ui/Badge";

interface BodyProps {
  deal: Deal;
  today: string;
  lifted?: boolean;
}

/** What a card looks like (REQ-65). Also used for the lifted copy that follows the pointer. */
export function CardBody({ deal, today, lifted }: BodyProps) {
  const style = STAGE_STYLE[deal.stage];
  const late = isLate(deal.stage, deal.close_date, today);
  const closed = deal.stage === "won" || deal.stage === "lost";
  return (
    <div
      className={`rounded-[14px] p-3.5 shadow-[0_1px_2px_rgba(7,59,76,.05)] ${closed ? "bg-[rgba(255,255,255,.7)]" : "bg-white"} ${
        lifted ? "-translate-y-[3px] rotate-[1.5deg] shadow-[0_16px_34px_rgba(7,59,76,.18)]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate text-[11.5px] font-medium text-ink-muted">{deal.organization_name}</span>
        {late ? <LateBadge /> : null}
      </div>
      <div className="mt-1 font-semibold leading-snug">
        <Link to={`/deals/${deal.id}`} className="hover:text-green-text" draggable={false}>{deal.name}</Link>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-mono text-[15px] font-semibold">{money(deal.value)}</span>
        <span className="font-mono text-[11px] text-ink-muted">{percent(deal.probability)}</span>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {deal.close_date ? (
          <span className={`flex items-center gap-[5px] whitespace-nowrap font-mono text-[11.5px] ${late ? "font-semibold text-raspberry-strong" : "text-ink-muted"}`}>
            {late ? <ClockAlert size={13} aria-hidden="true" /> : <Calendar size={13} aria-hidden="true" />}
            <span className="sr-only">{late ? "Late, was due " : "Close date "}</span>
            {formatDateShort(deal.close_date, today)}
          </span>
        ) : null}
        {deal.contact_name ? (
          <span className="flex items-center gap-[7px] overflow-hidden whitespace-nowrap text-xs text-ink-muted">
            <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[10px] font-bold text-ink" style={{ background: style.tint }} aria-hidden="true">
              {initials(deal.contact_name)}
            </span>
            <span className="truncate">{deal.contact_name}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SortableCardInner({ deal, today }: { deal: Deal; today: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`card-${deal.id}`}
      data-deal={deal.name}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`mb-2.5 cursor-grab outline-offset-2 ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      <CardBody deal={deal} today={today} />
    </div>
  );
}
export const SortableCard = memo(SortableCardInner);
