import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error";
interface Item {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastContext);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const show = useCallback((message: string, tone: Tone = "success") => {
    setItems((list) => [...list.slice(-3), { id: ++counter, message, tone }]);
  }, []);
  const remove = (id: number) => setItems((list) => list.filter((i) => i.id !== id));

  return (
    <ToastContext.Provider value={show}>
      <RadixToast.Provider swipeDirection="right" duration={3500}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => !open && remove(item.id)}
            className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-[13.5px] font-medium shadow-[0_12px_32px_rgba(7,59,76,.22)] ${
              item.tone === "error" ? "bg-raspberry-strong text-white" : "bg-ink text-white"
            }`}
          >
            <RadixToast.Description>{item.message}</RadixToast.Description>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-6 right-6 z-[60] flex w-[360px] max-w-[92vw] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
