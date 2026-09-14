import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import {
  usePrefs,
  clampConcurrency,
  MIN_CONCURRENCY,
  MAX_CONCURRENCY,
  TOAST_POSITIONS,
  type ToastPosition,
} from "@/context/PrefsContext";
import { cn } from "@/lib/utils";

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

function ControlRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] leading-snug text-muted-foreground/70">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Concurrency field, editable as free text so intermediate states can be typed. */
function ConcurrencyInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));

  // Re-sync when the stored value changes underneath (e.g. clamped on commit).
  React.useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isNaN(parsed) ? value : clampConcurrency(parsed);
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={MIN_CONCURRENCY}
      max={MAX_CONCURRENCY}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-8 w-20 text-center font-mono text-xs"
    />
  );
}

/** Miniature screen with a clickable quadrant per corner. */
function ToastPositionPicker({
  value,
  onChange,
}: {
  value: ToastPosition;
  onChange: (pos: ToastPosition) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Notification position"
      className="grid h-12 w-[72px] shrink-0 grid-cols-2 grid-rows-2 gap-0.5 rounded border border-border bg-background p-1"
    >
      {TOAST_POSITIONS.map((pos) => {
        const active = value === pos.value;
        return (
          <button
            key={pos.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={pos.label}
            title={pos.label}
            onClick={() => onChange(pos.value)}
            className="group flex items-center justify-center rounded-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "h-1.5 w-4 rounded-[1px] transition-colors",
                active
                  ? "bg-primary"
                  : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60",
              )}
            />
          </button>
        );
      })}
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
  const {
    parallelWrites,
    writeConcurrency,
    showRawTags,
    toastPosition,
    setParallelWrites,
    setWriteConcurrency,
    setShowRawTags,
    setToastPosition,
  } = usePrefs();

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
              Writes
            </span>
            <div className="flex flex-col gap-1.5">
              <ControlRow
                label="Parallel writes"
                hint="Off: one request at a time. On: several files are written at once."
              >
                <Switch
                  checked={parallelWrites}
                  onCheckedChange={setParallelWrites}
                  aria-label="Parallel writes"
                />
              </ControlRow>
              <ControlRow
                label="Requests at a time"
                hint={`${MIN_CONCURRENCY}–${MAX_CONCURRENCY}, multiplexed over one HTTP/2 connection.`}
              >
                <ConcurrencyInput
                  value={writeConcurrency}
                  disabled={!parallelWrites}
                  onCommit={setWriteConcurrency}
                />
              </ControlRow>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </span>
            <ControlRow
              label="Raw tag names"
              hint="Label fields with the file's own names (TPE2, ©gen) instead of the registry's. Display only — writes always use the raw name."
            >
              <Switch
                checked={showRawTags}
                onCheckedChange={setShowRawTags}
                aria-label="Raw tag names"
              />
            </ControlRow>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Appearance
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Modern Dark theme
              </div>
              <ControlRow
                label="Notification position"
                hint="Corner notifications appear in."
              >
                <ToastPositionPicker
                  value={toastPosition}
                  onChange={setToastPosition}
                />
              </ControlRow>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
