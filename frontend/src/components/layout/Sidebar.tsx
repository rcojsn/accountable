import { Building2, Handshake, Kanban, LayoutDashboard, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useContacts, useDeals, useOrganizations } from "../../api/hooks";
import { isOpen } from "../../lib/rules";

function Item({ to, icon, label, count, end }: { to: string; icon: ReactNode; label: string; count?: number; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium [&_svg]:text-ink-muted ${
          isActive ? "bg-[rgba(6,214,160,.16)] font-semibold text-ink [&_svg]:!text-green-text" : "text-ink-muted hover:bg-bg"
        }`
      }
    >
      {icon}
      {label}
      {count !== undefined ? <span className="ml-auto font-mono text-[11px] text-ink-muted">{count}</span> : null}
    </NavLink>
  );
}

export function Sidebar() {
  const deals = useDeals().data;
  const contacts = useContacts().data;
  const organizations = useOrganizations().data;

  return (
    <aside className="fixed bottom-4 left-4 top-4 z-10 flex w-[220px]">
      <div className="flex flex-1 flex-col gap-0.5 rounded-[20px] bg-white px-3.5 py-[22px] shadow-[0_1px_2px_rgba(7,59,76,.05)]">
        <div className="flex items-center gap-2.5 px-2.5 pb-[26px] text-lg font-bold tracking-tight">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ink text-[15px] text-green">a</span>
          Accountable
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          <Item to="/" end icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <Item to="/pipeline" icon={<Kanban size={18} />} label="Pipeline" count={deals?.filter((d) => isOpen(d.stage)).length} />
          <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-muted">Records</div>
          <Item to="/deals" icon={<Handshake size={18} />} label="Deals" count={deals?.length} />
          <Item to="/contacts" icon={<Users size={18} />} label="Contacts" count={contacts?.length} />
          <Item to="/organizations" icon={<Building2 size={18} />} label="Organizations" count={organizations?.length} />
        </nav>
        <div className="mt-auto rounded-xl bg-bg p-3 text-xs text-ink-muted">All amounts in South African rand (ZAR)</div>
      </div>
    </aside>
  );
}
