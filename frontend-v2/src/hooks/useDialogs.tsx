import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PromptOptions {
  title: string;
  description?: React.ReactNode;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogsContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const DialogsContext = React.createContext<DialogsContextValue | null>(null);

export function useDialogs(): DialogsContextValue {
  const ctx = React.useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs must be used within <DialogsProvider>");
  return ctx;
}

type ActiveDialog =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

export function DialogsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<ActiveDialog | null>(null);
  const [value, setValue] = React.useState("");

  const confirm = React.useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setActive({ kind: "confirm", opts, resolve });
      }),
    [],
  );

  const prompt = React.useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(opts.defaultValue ?? "");
        setActive({ kind: "prompt", opts, resolve });
      }),
    [],
  );

  const close = (result: boolean | string | null) => {
    if (!active) return;
    if (active.kind === "confirm") {
      active.resolve(result as boolean);
    } else {
      active.resolve(result as string | null);
    }
    setActive(null);
  };

  const open = active !== null;

  return (
    <DialogsContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) close(active?.kind === "prompt" ? null : false);
        }}
      >
        {active && (
          <DialogContent
            onKeyDown={(e) => {
              if (e.key === "Enter" && active.kind === "prompt") {
                e.preventDefault();
                if (value.trim()) close(value.trim());
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{active.opts.title}</DialogTitle>
              {active.opts.description && (
                <DialogDescription>{active.opts.description}</DialogDescription>
              )}
            </DialogHeader>

            {active.kind === "prompt" && (
              <div className="flex flex-col gap-1.5">
                {active.opts.label && (
                  <label className="text-xs font-medium text-muted-foreground">
                    {active.opts.label}
                  </label>
                )}
                <Input
                  autoFocus
                  value={value}
                  placeholder={active.opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => close(active.kind === "prompt" ? null : false)}
              >
                {active.opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={
                  active.kind === "confirm" && active.opts.destructive
                    ? "destructive"
                    : "default"
                }
                disabled={active.kind === "prompt" && !value.trim()}
                onClick={() =>
                  close(active.kind === "prompt" ? value.trim() : true)
                }
              >
                {active.opts.confirmLabel ??
                  (active.kind === "confirm" ? "Confirm" : "OK")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogsContext.Provider>
  );
}
