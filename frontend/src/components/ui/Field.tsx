import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl bg-bg px-3.5 py-2.5 text-[14px] text-ink placeholder:text-[#7d949c] outline-none ring-0 focus:bg-white focus:outline-2 focus:outline-cerulean-strong aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-raspberry-strong";

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** A labelled form field. Required fields are marked, and an error reads "Required" beneath the field. */
export function Field({ label, htmlFor, required, error, hint, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-raspberry-strong" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-semibold text-raspberry-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
