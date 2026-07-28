import * as React from "react";
import {
  History as HistoryIcon,
  X,
  ArrowRight,
  Undo2,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Loader2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useHistoryPanel } from "@/context/HistoryContext";
import { useToast } from "@/components/ui/toast";
import type { HistoryEntry } from "@/lib/types";
import { parseChangedAt, cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; className: string }> = {
  add: { label: "Added", className: "bg-success/15 text-success" },
  remove: { label: "Removed", className: "bg-destructive/15 text-destructive" },
  change: { label: "Changed", className: "bg-primary/15 text-primary" },
};

export function HistoryPanel() {
  const { open, target, close, refreshTags } = useHistoryPanel();
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  const [newest, setNewest] = React.useState(true);
  const [reloadToken, setReloadToken] = React.useState(0);
  const showThrobber = useDelayedFlag(loading);

  const identifier = target?.identifier ?? null;

  React.useEffect(() => {
    if (!open || !identifier) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFilters(new Set());
    api
      .getHistory(identifier)
      .then((data) => {
        if (cancelled) return;
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Failed to load history");
        setEntries([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, identifier, reloadToken]);

  const tags = React.useMemo(
    () =>
      [...new Set(entries.map((e) => (e.tag ?? "").toUpperCase()))]
        .filter(Boolean)
        .sort(),
    [entries],
  );

  const visible = React.useMemo(() => {
    const list =
      filters.size === 0
        ? entries
        : entries.filter((e) => filters.has((e.tag ?? "").toUpperCase()));
    return [...list].sort((a, b) => {
      const ta = parseChangedAt(a.changed_at).getTime();
      const tb = parseChangedAt(b.changed_at).getTime();
      return newest ? tb - ta : ta - tb;
    });
  }, [entries, filters, newest]);

  const toggleFilter = (tag: string) =>
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const undo = async (entry: HistoryEntry) => {
    try {
      await api.undo(entry);
      toast("Undo applied", "success");
      setReloadToken((t) => t + 1);
      refreshTags();
    } catch (err) {
      toast(`Undo failed: ${(err as Error).message}`, "error");
    }
  };

  if (!open || !target) return null;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border bg-background animate-slide-in-right">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <HistoryIcon className="size-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">Change History</span>
            <span className="truncate text-xs text-muted-foreground" title={target.title}>
              {target.title}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close history">
          <X />
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleFilter(tag)}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase transition-colors",
                  filters.has(tag)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setNewest((n) => !n)}
            className="shrink-0"
          >
            {newest ? <ArrowDownWideNarrow /> : <ArrowUpWideNarrow />}
            {newest ? "Newest" : "Oldest"}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          showThrobber ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Loading history…</span>
            </div>
          ) : null
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <X className="size-6 text-destructive" />
            <p className="text-sm">Failed to load history</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Inbox className="size-8 opacity-50" />
            <p className="text-sm">
              {entries.length === 0 ? "No changes recorded yet" : "No matching entries"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} onUndo={() => undo(entry)} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function HistoryCard({
  entry,
  onUndo,
}: {
  entry: HistoryEntry;
  onUndo: () => void;
}) {
  const meta = ACTION_META[entry.action] ?? {
    label: entry.action,
    className: "bg-muted text-muted-foreground",
  };
  const date = parseChangedAt(entry.changed_at);
  const dateLabel = isNaN(date.getTime())
    ? entry.changed_at
    : date.toLocaleString();

  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
            meta.className,
          )}
        >
          {meta.label}
        </span>
        <span className="truncate font-mono text-xs font-medium">{entry.tag}</span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {dateLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {entry.action === "change" ? (
          <>
            <ValueChip label="Before" value={entry.old_value} tone="old" />
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            <ValueChip label="After" value={entry.new_value} tone="new" />
          </>
        ) : entry.action === "add" ? (
          <ValueChip label="Value" value={entry.new_value} tone="new" />
        ) : (
          <ValueChip label="Value" value={entry.old_value} tone="old" />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">#{entry.id}</span>
        <Button variant="ghost" size="xs" onClick={onUndo}>
          <Undo2 />
          Undo
        </Button>
      </div>
    </div>
  );
}

function ValueChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "old" | "new";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded border px-2 py-1",
        tone === "old"
          ? "border-destructive/30 bg-destructive/5"
          : "border-success/30 bg-success/5",
      )}
    >
      <span className="text-[9px] uppercase text-muted-foreground">{label}</span>
      <span className="truncate" title={value}>
        {value || <span className="italic text-muted-foreground">empty</span>}
      </span>
    </div>
  );
}
