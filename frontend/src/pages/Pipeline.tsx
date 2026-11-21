import { Plus } from "lucide-react";
import { useState } from "react";
import { useDeals } from "../api/hooks";
import type { Stage } from "../api/types";
import { DealDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { Board } from "../components/pipeline/Board";
import { Button } from "../components/ui/Button";
import { boardTotals } from "../lib/board";
import { money } from "../lib/format";
import { todayIso } from "../lib/rules";

export default function Pipeline() {
  const { data: deals } = useDeals();
  const [adding, setAdding] = useState<Stage | null>(null);
  const t = boardTotals(deals ?? []);

  return (
    <>
      <PageHeader
        eyebrow="Drag a card to change its stage or its place"
        title="Pipeline"
        actions={
          <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5">
            <Figure label="Open deals" value={String(t.count)} testId="board-count" />
            <Figure label="Open pipeline" value={money(t.value)} testId="board-value" />
            <Figure label="Expected revenue" value={money(t.expected)} testId="board-expected" green />
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding("new")}>New deal</Button>
          </div>
        }
      />
      {deals ? <Board deals={deals} today={todayIso()} onAdd={setAdding} /> : <p className="text-ink-muted">Loading…</p>}
      <DealDialog state={adding ? null : undefined} defaults={{ stage: adding ?? "new" }} onClose={() => setAdding(null)} />
    </>
  );
}

function Figure({ label, value, testId, green }: { label: string; value: string; testId: string; green?: boolean }) {
  return (
    <div className="pr-[18px]">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className={`font-mono text-base font-semibold ${green ? "text-green-text" : ""}`} data-testid={testId}>{value}</div>
    </div>
  );
}
