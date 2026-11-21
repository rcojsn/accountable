import { Plus } from "lucide-react";
import { useState } from "react";
import { useDashboard } from "../api/hooks";
import { Funnel } from "../components/dashboard/Funnel";
import { FollowUps } from "../components/dashboard/FollowUps";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { RevenuePanel } from "../components/dashboard/RevenuePanel";
import { StageStrip } from "../components/dashboard/StageStrip";
import { Tiles } from "../components/dashboard/Tiles";
import { WonLostChart } from "../components/dashboard/WonLostChart";
import { DealDialog } from "../components/forms/RecordDialogs";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { formatLongDate, moneyWords, plural } from "../lib/format";

export default function Dashboard() {
  const { data } = useDashboard();
  const [adding, setAdding] = useState(false);
  const action = <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>New deal</Button>;

  if (!data) return <PageHeader title="Dashboard" actions={action} />;

  const h = data.headline;
  const headline = h.open_deal_count > 0 ? (
    <h1 className="mt-1.5 font-serif text-[42px] font-normal leading-[1.08] tracking-[-0.01em]" data-testid="headline">
      {moneyWords(h.expected_revenue)} expected from <em className="text-green-text">{plural(h.open_deal_count, "open deal")}</em>
    </h1>
  ) : (
    <h1 className="mt-1.5 font-serif text-[42px] font-normal leading-[1.08] tracking-[-0.01em]" data-testid="headline">No open deals yet</h1>
  );

  return (
    <>
      <PageHeader eyebrow={formatLongDate(data.today)} headline={headline} actions={action} />
      <div className="grid grid-cols-12 gap-[18px]">
        <div className="col-span-12"><RevenuePanel data={data} /></div>
        <div className="col-span-12"><Tiles data={data} /></div>
        <div className="col-span-12"><StageStrip stages={data.stages} /></div>
        <div className="col-span-7 min-w-0"><Funnel funnel={data.funnel} /></div>
        <div className="col-span-5 min-w-0"><WonLostChart months={data.months} /></div>
        <div className="col-span-7 min-w-0"><FollowUps data={data} /></div>
        <div className="col-span-5 min-w-0"><RecentActivity items={data.recent_activity} /></div>
      </div>
      <DealDialog state={adding ? null : undefined} onClose={() => setAdding(false)} />
    </>
  );
}
