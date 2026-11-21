import type { HTMLAttributes } from "react";

export function Panel({ className = "", children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`min-w-0 rounded-[20px] bg-panel p-[26px] ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-[18px] flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {meta ? <span className="text-xs text-ink-muted">{meta}</span> : null}
      {children}
    </div>
  );
}
