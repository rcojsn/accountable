import {
  closestCenter, DndContext, DragOverlay, getFirstCollision, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type KeyboardCoordinateGetter, type DragStartEvent, type UniqueIdentifier,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { moveDealRequest } from "../../api/hooks";
import type { Deal, Stage } from "../../api/types";
import { applyMove, beforeIdForDrop, fullColumns, groupDeals, totals } from "../../lib/board";
import { STAGES } from "../../lib/rules";
import { useToast } from "../ui/Toast";
import { Column } from "./Column";
import { CardBody } from "./DealCard";

type Ids = Record<Stage, number[]>;

const asStage = (id: UniqueIdentifier): Stage | null => (typeof id === "string" && id.startsWith("col-") ? (id.slice(4) as Stage) : null);
const stageOf = (ids: Ids, id: UniqueIdentifier): Stage | null => asStage(id) ?? STAGES.find((s) => ids[s].includes(id as number)) ?? null;

interface Props {
  deals: Deal[];
  today: string;
  onAdd: (stage: Stage) => void;
}

/**
 * The six columns, with drag and drop by mouse and keyboard (REQ-60 to REQ-67).
 * Cards stay in their own column while a card is dragged; where it lands is worked out when it is dropped.
 */
export function Board({ deals, today, onAdd }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const columns = useMemo(() => groupDeals(deals, today), [deals, today]);
  const byId = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const ids = useMemo(() => Object.fromEntries(STAGES.map((s) => [s, columns[s].map((d) => d.id)])) as Ids, [columns]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const idsRef = useRef(ids);
  idsRef.current = ids;

  // Keyboard: Left and Right change column, Up and Down change place; the card lands on the target card's spot.
  const target = useRef<{ stage: Stage; index: number } | null>(null);
  const keyboard = useCallback<KeyboardCoordinateGetter>((event, { context: { active, droppableRects } }) => {
    const lists = idsRef.current;
    if (!active) return;
    if (!target.current) {
      const stage = stageOf(lists, active.id);
      if (!stage) return;
      target.current = { stage, index: lists[stage].indexOf(active.id as number) };
    }
    let { stage, index } = target.current;
    const col = STAGES.indexOf(stage);
    if (event.code === "ArrowRight" && col < STAGES.length - 1) stage = STAGES[col + 1];
    else if (event.code === "ArrowLeft" && col > 0) stage = STAGES[col - 1];
    else if (event.code === "ArrowDown") index += 1;
    else if (event.code === "ArrowUp") index -= 1;
    else return;
    event.preventDefault();
    index = Math.max(0, Math.min(index, lists[stage].length - 1));
    target.current = { stage, index };
    const rect = droppableRects.get(lists[stage][index] ?? `col-${stage}`) ?? droppableRects.get(`col-${stage}`);
    return rect ? { x: rect.left, y: rect.top } : undefined;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboard }),
  );

  // The pointer decides the column; the nearest card inside it decides the place.
  const collision = useCallback<CollisionDetection>((args) => {
    const pointer = pointerWithin(args);
    const hits = pointer.length > 0 ? pointer : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");
    if (overId == null) return [];
    const stage = asStage(overId);
    if (stage && idsRef.current[stage].length > 0) {
      const inside = args.droppableContainers.filter((c) => c.id !== overId && idsRef.current[stage].includes(c.id as number));
      overId = closestCenter({ ...args, droppableContainers: inside })[0]?.id ?? overId;
    }
    return [{ id: overId }];
  }, []);

  const commit = async (dealId: number, stage: Stage, beforeId: number | null) => {
    await qc.cancelQueries({ queryKey: ["deals"] });
    const previous = qc.getQueryData<Deal[]>(["deals"]);
    if (!previous) return;
    qc.setQueryData<Deal[]>(["deals"], applyMove(previous, dealId, stage, beforeId, today)); // totals follow at once (REQ-63)
    try {
      await moveDealRequest(dealId, stage, beforeId);
    } catch {
      qc.setQueryData<Deal[]>(["deals"], previous); // REQ-66
      toast("The move wasn't saved", "error");
    } finally {
      qc.invalidateQueries();
    }
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    target.current = null;
    setActiveId(active.id as number);
  };

  const onDragEnd = ({ active, over, activatorEvent, delta }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const deal = byId.get(active.id as number);
    const stage = stageOf(ids, over.id);
    if (!deal || !stage) return;

    // Where the pointer let go, to tell the upper half of a card from the lower half.
    const translated = active.rect.current.translated;
    const pointerY =
      "clientY" in activatorEvent ? (activatorEvent as PointerEvent).clientY + delta.y : (translated?.top ?? 0) + (translated?.height ?? 0) / 2;
    const others = ids[stage].filter((i) => i !== deal.id);
    let at = others.length;
    if (!asStage(over.id)) {
      const overIndex = others.indexOf(over.id as number);
      if (overIndex === -1) return; // dropped on itself
      const sameColumn = stage === deal.stage;
      const movingDown = sameColumn && ids[stage].indexOf(deal.id) < ids[stage].indexOf(over.id as number);
      const lower = pointerY > over.rect.top + over.rect.height / 2;
      at = overIndex + (sameColumn ? (movingDown ? 1 : 0) : lower ? 1 : 0);
    }
    const next = [...others.slice(0, at), deal.id, ...others.slice(at)];
    if (stage === deal.stage && next.join() === ids[stage].join()) return; // dropped where it was
    const fullOthers = fullColumns(deals)[stage].map((d) => d.id).filter((i) => i !== deal.id);
    void commit(deal.id, stage, beforeIdForDrop(others, at, fullOthers));
  };

  const activeDeal = activeId !== null ? byId.get(activeId) : undefined;

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="grid grid-cols-[repeat(6,minmax(172px,1fr))] items-start gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} cards={columns[stage]} ids={ids[stage]} totals={totals(columns[stage])} today={today} onAdd={onAdd} />
        ))}
      </div>
      <DragOverlay>{activeDeal ? <CardBody deal={activeDeal} today={today} lifted /> : null}</DragOverlay>
    </DndContext>
  );
}
