import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Deal, Stage } from "../../api/types";
import type { Totals } from "../../lib/board";
import { money } from "../../lib/format";
import { PROBABILITY } from "../../lib/rules";
import { STAGE_STYLE } from "../../lib/stages";
import { SortableCard } from "./DealCard";

interface Props {
  stage: Stage;
  /** The cards as shown right now (during a drag this is the live order). */
  cards: Deal[];
  /** Same order as `cards`; a stable array so dnd-kit does not see a new list every render. */
  ids: number[];
  totals: Totals;
  today: string;
  onAdd: (stage: Stage) => void;
}

export function Column({ stage, cards, ids, totals, today, onAdd }: Props) {
  const style = STAGE_STYLE[stage];
  const closed = stage === "won" || stage === "lost";
  const { setNodeRef } = useDroppable({ id: `col-${stage}` });

  return (
    <section aria-label={`${style.name} column`} data-testid={`column-${stage}`} className="min-w-0">
      <div className="mb-3 rounded-2xl bg-white p-3.5">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap rounded-full px-[11px] py-[3px] text-[13px] font-semibold" style={{ background: style.badge, color: style.badgeOn }}>
            {style.name}
          </span>
          <span className="font-mono text-xs text-ink-muted" data-testid={`count-${stage}`}>{totals.count}</span>
          <button
            type="button"
            aria-label={`Add deal to ${style.name}`}
            title={`Add deal to ${style.name}`}
            onClick={() => onAdd(stage)}
            className="ml-auto grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-bg hover:bg-[#e1eaec]"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="mt-3 font-mono text-lg font-semibold tracking-[-0.02em]" data-testid={`value-${stage}`}>{money(totals.value)}</div>
        {closed ? (
          <div className="mt-2.5 text-[11.5px] text-ink-muted">Closed in the last 30 days</div>
        ) : (
          <>
            <div className="mt-0.5 flex justify-between text-xs text-ink-muted">
              <span>Expected</span>
              <b className="font-mono font-medium text-ink" data-testid={`expected-${stage}`}>{money(totals.expected)}</b>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg" role="presentation">
              <span className="block h-full rounded-full" style={{ width: `${PROBABILITY[stage]}%`, background: style.fill }} />
            </div>
          </>
        )}
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="min-h-[560px] rounded-2xl">
          {cards.map((d) => (
            <SortableCard key={d.id} deal={d} today={today} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
