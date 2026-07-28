import { cn } from "@/lib/utils";
import { useApp, type ConnectionStatus } from "@/context/AppContext";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
};

const DOT: Record<ConnectionStatus, string> = {
  connecting: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]",
  connected: "bg-success shadow-[0_0_0_3px_rgba(16,185,129,0.2)]",
  disconnected: "bg-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
  error: "bg-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
};

export function StatusIndicator() {
  const { status } = useApp();
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full transition-colors",
          DOT[status],
          status === "connecting" && "animate-pulse",
        )}
      />
      <span className="hidden sm:inline">{LABELS[status]}</span>
    </div>
  );
}
