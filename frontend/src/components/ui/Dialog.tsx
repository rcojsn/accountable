import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./Button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Dialog({ open, onOpenChange, title, description, children, wide }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(7,59,76,.38)]" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] bg-white p-7 shadow-[0_24px_60px_rgba(7,59,76,.25)] ${wide ? "max-w-[640px]" : "max-w-[520px]"}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-xl font-semibold tracking-tight">{title}</RadixDialog.Title>
              <RadixDialog.Description className={description ? "mt-1 text-[13px] text-ink-muted" : "sr-only"}>
                {description ?? title}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close">
                <X size={18} />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
