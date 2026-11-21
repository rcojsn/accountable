import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white px-[18px] py-2.5 hover:bg-[#0a4d63] [&_svg]:text-green",
  secondary: "bg-white text-ink px-[18px] py-2.5 hover:bg-[#e6edef] ",
  danger: "bg-raspberry-strong text-white px-[18px] py-2.5 hover:bg-[#a8173d]",
  ghost: "text-ink-muted px-3 py-2 hover:bg-[#e6edef]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", icon, children, className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "danger";
}

/** A round icon-only button. The label is read by screen readers and shown as a tooltip. */
export function IconButton({ label, tone = "default", children, className = "", type = "button", ...rest }: IconButtonProps) {
  const color = tone === "danger" ? "text-raspberry-strong hover:bg-[rgba(239,71,111,.12)]" : "text-ink-muted hover:bg-[#e6edef]";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-grid h-8 w-8 place-items-center rounded-full transition-colors ${color} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
