import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let counter = 0;

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-success" />,
  error: <AlertCircle className="size-5 text-destructive" />,
  info: <Info className="size-5 text-primary" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((message: string, type: ToastType = "success") => {
    setItems((prev) => [...prev, { id: ++counter, message, type }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={3500}>
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => !open && remove(item.id)}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-popover px-4 py-3 shadow-xl animate-slide-in-right",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out",
            )}
          >
            {ICONS[item.type]}
            <ToastPrimitive.Description className="text-sm text-popover-foreground">
              {item.message}
            </ToastPrimitive.Description>
            <ToastPrimitive.Close className="ml-2 rounded p-0.5 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-[380px] max-w-[100vw] flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
