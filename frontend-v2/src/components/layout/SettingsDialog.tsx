import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/context/AppContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate font-mono text-xs text-foreground">
        {value}
      </span>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { settings, mountPoint, useRteid } = useApp();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Server
            </span>
            <div className="flex flex-col gap-1.5">
              <Row label="Version" value={settings?.version ?? "—"} />
              <Row label="Mount point" value={mountPoint ?? "—"} />
              <Row label="RTEID mode" value={useRteid ? "Enabled" : "Disabled"} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Appearance
            </span>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Modern Dark theme
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
