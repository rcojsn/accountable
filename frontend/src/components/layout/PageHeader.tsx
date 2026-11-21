import type { ReactNode } from "react";

interface Props {
  eyebrow?: ReactNode;
  title?: string;
  /** Replaces the plain title, e.g. the dashboard sentence. */
  headline?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, headline, actions }: Props) {
  return (
    <header className="mb-[26px] flex items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow ? <div className="text-[13px] font-medium text-ink-muted">{eyebrow}</div> : null}
        {headline ?? <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.015em]">{title}</h1>}
      </div>
      {actions ? <div className="flex flex-none items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}
