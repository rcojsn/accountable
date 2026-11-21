import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, useState } from "react";

export interface ComboOption {
  value: number;
  label: string;
  group?: string;
}

interface ComboboxProps {
  id: string;
  options: ComboOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  invalid?: boolean;
  clearLabel?: string;
}

/** A searchable select. The trigger is a button, so a form can focus it. */
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  { id, options, value, onChange, placeholder = "Choose…", invalid, clearLabel },
  ref,
) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const groups = [...new Set(options.map((o) => o.group ?? ""))];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-bg px-3.5 py-2.5 text-left text-[14px] outline-none focus:bg-white focus-visible:outline-2 focus-visible:outline-cerulean-strong aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-raspberry-strong"
        >
          <span className={`truncate ${selected ? "" : "text-[#7d949c]"}`}>{selected ? selected.label : placeholder}</span>
          <ChevronDown size={16} className="flex-none text-ink-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-[240px] rounded-2xl bg-white p-2 shadow-[0_16px_40px_rgba(7,59,76,.22)]"
        >
          <Command>
            <Command.Input
              autoFocus
              placeholder="Search…"
              aria-label="Search options"
              className="mb-1 w-full rounded-lg bg-bg px-3 py-2 text-[13.5px] outline-none"
            />
            <Command.List className="max-h-60 overflow-y-auto">
              <Command.Empty className="px-3 py-3 text-[13px] text-ink-muted">Nothing found.</Command.Empty>
              {clearLabel && value !== null ? (
                <Command.Item
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-[13.5px] text-ink-muted data-[selected=true]:bg-bg"
                >
                  {clearLabel}
                </Command.Item>
              ) : null}
              {groups.map((g) => (
                <Command.Group key={g} heading={g || undefined} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-muted">
                  {options
                    .filter((o) => (o.group ?? "") === g)
                    .map((o) => (
                      <Command.Item
                        key={o.value}
                        value={`${o.label} ${o.value}`}
                        onSelect={() => {
                          onChange(o.value);
                          setOpen(false);
                        }}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13.5px] data-[selected=true]:bg-bg"
                      >
                        <span className="truncate">{o.label}</span>
                        {o.value === value ? <Check size={14} className="flex-none text-green-text" /> : null}
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
