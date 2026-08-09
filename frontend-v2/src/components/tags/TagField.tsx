import * as React from "react";
import { X, Scissors, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDialogs } from "@/hooks/useDialogs";
import { useExplorer } from "@/context/ExplorerContext";
import { usePrefs } from "@/context/PrefsContext";
import { hasAnyDelimiter } from "@/lib/splitValue";
import { SplitValueDialog } from "./SplitValueDialog";
import type { useTagMutations } from "@/hooks/useTagMutations";
import type { TagValue } from "@/lib/types";

type Mutations = ReturnType<typeof useTagMutations>;

/** How long a freshly saved/added box keeps its green outline before fading. */
const SETTLE_MS = 900;
/** Safety net: never leave a row stuck in "saving" if a reload never arrives. */
const SAVE_TIMEOUT_MS = 6000;

function countOf(list: string[], value: string) {
  let n = 0;
  for (const el of list) if (el === value) n += 1;
  return n;
}

/**
 * Height + fade collapse for the inline action rows. Children stay mounted so
 * closing animates too; `invisible` only applies once the fade has finished,
 * which also keeps the hidden buttons out of the tab order.
 */
function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid transition-all duration-200 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 invisible",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/** Confirm-scope hook: asks File/Folder + confirmation, then removes `value`. */
function useRemoveScope(
  tagKey: string,
  label: string,
  filePath: string,
  mut: Mutations,
) {
  const { confirm } = useDialogs();
  const { folderMusicPaths } = useExplorer();
  return React.useCallback(
    async (scope: "file" | "folder", value: string, onDone?: () => void) => {
      const ok = await confirm({
        title: `Remove “${label}”?`,
        description:
          scope === "file"
            ? "This deletes the tag value from this file."
            : `This deletes the tag value from all ${folderMusicPaths.length} music file(s) in this folder.`,
        destructive: true,
        confirmLabel: "Remove",
      });
      if (!ok) return false;
      onDone?.();
      return scope === "file"
        ? await mut.removeFile(filePath, tagKey, value)
        : await mut.removeFolder(tagKey, value);
    },
    [tagKey, label, filePath, mut, confirm, folderMusicPaths.length],
  );
}

function ScopeButtons({
  label,
  onScope,
  onCancel,
  fileVariant = "destructive",
}: {
  label: string;
  onScope: (scope: "file" | "folder") => void;
  onCancel: () => void;
  fileVariant?: "destructive" | "default";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pl-1 pt-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Button size="xs" variant={fileVariant} onClick={() => onScope("file")}>
        File
      </Button>
      <Button
        size="xs"
        variant={fileVariant === "destructive" ? "destructive" : "success"}
        onClick={() => onScope("folder")}
      >
        Folder
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/** Spinner pinned inside a value box while its write is in flight. */
function RowSpinner() {
  return (
    <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-success" />
  );
}

/** One existing editable value: box + (array) delete cross + split + save actions. */
function ValueRow({
  filePath,
  tagKey,
  label,
  original,
  mut,
  reload,
  inArray,
  roundingClass,
  offsetClass,
  glow,
  marked,
  settled,
  leaving,
  onRemoveClick,
}: {
  filePath: string;
  tagKey: string;
  label: string;
  original: string;
  mut: Mutations;
  reload: () => void;
  inArray: boolean;
  roundingClass?: string;
  offsetClass?: string;
  glow?: boolean;
  marked?: boolean;
  settled?: boolean;
  leaving?: boolean;
  onRemoveClick: () => void;
}) {
  const [draft, setDraft] = React.useState(original);
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const safety = React.useRef<number | undefined>(undefined);

  // A reload landed with new content: the save is done, adopt it.
  React.useEffect(() => {
    setDraft(original);
    setSaving(false);
    window.clearTimeout(safety.current);
  }, [original]);

  React.useEffect(() => () => window.clearTimeout(safety.current), []);

  const dirty = draft !== original;
  const splittable = hasAnyDelimiter(original);
  const busy = saving || leaving;

  // Stay in "saving" until the reloaded value replaces `original`, so the box
  // never flips back to an editable draft for a frame before it updates.
  const save = async (scope: "file" | "folder") => {
    setSaving(true);
    const ok =
      scope === "file"
        ? await mut.editFile(filePath, tagKey, original, draft)
        : await mut.editFolder(tagKey, original, draft);
    if (!ok) setSaving(false);
    else safety.current = window.setTimeout(() => setSaving(false), SAVE_TIMEOUT_MS);
  };

  return (
    <div
      className={cn(
        "group/row relative flex flex-col focus-within:z-10",
        offsetClass,
        (glow || marked || settled) && "z-10",
        // A value inside an array folds away; a lone value (whose whole field
        // is about to disappear) just dims, so no gap opens under its label.
        leaving && (inArray ? "animate-value-out overflow-hidden" : "opacity-50"),
      )}
      data-tag-key={tagKey}
      data-tag-label={label}
      data-tag-value={original}
    >
      <div className="relative">
        <Input
          value={draft}
          readOnly={busy}
          onChange={(e) => setDraft(e.target.value)}
          className={cn(
            "relative transition-all duration-300",
            roundingClass,
            glow && "shadow-[0_8px_16px_-6px_hsl(var(--success)/0.85)]",
            marked && "ring-1 ring-destructive/70",
            (settled || saving) && "ring-1 ring-success/60",
            busy && "text-muted-foreground",
          )}
        />
        {saving && <RowSpinner />}
        {splittable && !busy && (
          <button
            onClick={() => setSplitOpen(true)}
            title="Split into multiple values"
            className={cn(
              "absolute top-1 z-10 rounded-full bg-card/90 p-0.5 text-primary shadow-sm transition-opacity hover:bg-primary/15",
              inArray ? "right-8" : "right-1",
              "opacity-0 group-hover/row:opacity-100",
            )}
          >
            <Scissors className="size-3.5" />
          </button>
        )}
        {inArray && !busy && (
          <button
            onClick={onRemoveClick}
            title="Remove this value"
            className={cn(
              "absolute right-1 top-1 z-10 rounded-full bg-card/90 p-0.5 text-destructive shadow-sm transition-opacity hover:bg-destructive/15",
              marked ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
            )}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Collapse open={dirty && !saving}>
        <div className="flex flex-wrap gap-2 pl-1 pt-1.5">
          <Button size="xs" onClick={() => save("file")}>
            Save file
          </Button>
          <Button size="xs" variant="success" onClick={() => save("folder")}>
            Save folder
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDraft(original)}>
            Cancel
          </Button>
        </div>
      </Collapse>

      {splitOpen && (
        <SplitValueDialog
          open={splitOpen}
          onOpenChange={setSplitOpen}
          filePath={filePath}
          sourceKey={tagKey}
          sourceLabel={label}
          value={original}
          reload={reload}
        />
      )}
    </div>
  );
}

/** The new (unsaved) value textbox spawned by the add-value affordance. */
function NewValueRow({
  onSubmit,
  onClose,
  roundingClass,
  offsetClass,
}: {
  onSubmit: (scope: "file" | "folder", value: string) => void;
  onClose: () => void;
  roundingClass?: string;
  offsetClass?: string;
}) {
  const [value, setValue] = React.useState("");
  const trimmed = value.trim();

  return (
    <div className={cn("relative flex flex-col focus-within:z-10", offsetClass)}>
      <Input
        autoFocus
        value={value}
        placeholder="New value…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        className={cn(
          "relative ring-1 ring-success/60 transition-all duration-300 focus-visible:ring-success",
          roundingClass,
        )}
      />
      <Collapse open={trimmed.length > 0}>
        <ScopeButtons
          label="Add value to:"
          fileVariant="default"
          onScope={(scope) => onSubmit(scope, trimmed)}
          onCancel={onClose}
        />
      </Collapse>
    </div>
  );
}

/**
 * The submitted-but-not-yet-reloaded value. It stands in for the real box at
 * the same size and position, so the add round trip reads as one box settling
 * in rather than a box vanishing and popping back.
 */
function PendingValueRow({
  value,
  roundingClass,
  offsetClass,
}: {
  value: string;
  roundingClass?: string;
  offsetClass?: string;
}) {
  return (
    <div className={cn("relative z-10 flex flex-col", offsetClass)}>
      <div className="relative">
        <Input
          value={value}
          readOnly
          tabIndex={-1}
          className={cn(
            "relative text-muted-foreground ring-1 ring-success/60 transition-all duration-300",
            roundingClass,
          )}
        />
        <RowSpinner />
      </div>
    </div>
  );
}

/**
 * Invisible hover strip just beneath a field. After a short beat it "arms" —
 * making the box above glow green — and a click adds another value.
 */
function AddValueHint({
  disabled,
  onArmedChange,
  onOpen,
}: {
  disabled?: boolean;
  onArmedChange: (armed: boolean) => void;
  onOpen: () => void;
}) {
  const timer = React.useRef<number | undefined>(undefined);

  const arm = () => {
    timer.current = window.setTimeout(() => onArmedChange(true), 300);
  };
  const disarm = () => {
    window.clearTimeout(timer.current);
    onArmedChange(false);
  };

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div
      onMouseEnter={arm}
      onMouseLeave={disarm}
      onClick={() => {
        disarm();
        onOpen();
      }}
      title="Add another value to this field"
      className={cn("-mt-1 h-4 cursor-pointer", disabled && "pointer-events-none")}
    />
  );
}

export function TagField({
  filePath,
  tagKey,
  label,
  labelTitle,
  value,
  mut,
  reload,
}: {
  filePath: string;
  /** The file's raw tag name — what every write on this field sends. */
  tagKey: string;
  /** What to render as the field name (raw or normalized, per the toggle). */
  label: string;
  labelTitle?: string;
  value: TagValue;
  mut: Mutations;
  reload: () => void;
}) {
  const { showRawTags } = usePrefs();
  const isArray = Array.isArray(value);
  const elements = isArray ? (value as string[]) : [value as string];
  const [adding, setAdding] = React.useState(false);
  const [armed, setArmed] = React.useState(false);
  const [removingIndex, setRemovingIndex] = React.useState<number | null>(null);
  // A submitted value waiting for its reload, with how many copies existed
  // before — that's how we recognise the reloaded array as containing it.
  const [pending, setPending] = React.useState<
    { value: string; baseline: number } | null
  >(null);
  // Index whose removal is in flight; the row folds away while it runs.
  const [leavingIndex, setLeavingIndex] = React.useState<number | null>(null);
  // Value that just landed, briefly outlined green before fading to normal.
  const [settledValue, setSettledValue] = React.useState<string | null>(null);
  const pendingSafety = React.useRef<number | undefined>(undefined);
  const askRemove = useRemoveScope(tagKey, label, filePath, mut);

  // Reset pending interaction state once the field's content changes.
  const contentKey = isArray ? (value as string[]).join(" ") : String(value);
  React.useEffect(() => {
    setRemovingIndex(null);
    setLeavingIndex(null);
  }, [contentKey]);

  // Hand the pending box over to the real row once the added value shows up.
  React.useEffect(() => {
    if (!pending) return;
    if (countOf(elements, pending.value) > pending.baseline) {
      window.clearTimeout(pendingSafety.current);
      setPending(null);
      setSettledValue(pending.value);
    }
    // `contentKey` stands in for the (freshly allocated each render) elements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, pending]);

  React.useEffect(() => () => window.clearTimeout(pendingSafety.current), []);

  React.useEffect(() => {
    if (settledValue === null) return;
    const t = window.setTimeout(() => setSettledValue(null), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [settledValue]);

  const toggleRemove = (i: number) =>
    setRemovingIndex((prev) => (prev === i ? null : i));

  const submitAdd = async (scope: "file" | "folder", newValue: string) => {
    setAdding(false);
    setPending({ value: newValue, baseline: countOf(elements, newValue) });
    const ok =
      scope === "file"
        ? await mut.addFile(filePath, tagKey, newValue)
        : await mut.addFolder(tagKey, newValue);
    // On success the reload retires the box; the timer only covers the case
    // where the stored value comes back different from what we sent.
    if (!ok) setPending(null);
    else
      pendingSafety.current = window.setTimeout(
        () => setPending(null),
        SAVE_TIMEOUT_MS,
      );
  };

  const removeTarget =
    removingIndex !== null && removingIndex < elements.length
      ? elements[removingIndex]
      : null;

  const startRemove = async (scope: "file" | "folder") => {
    if (removeTarget === null || removingIndex === null) return;
    const index = removingIndex;
    const ok = await askRemove(scope, removeTarget, () => {
      setRemovingIndex(null);
      setLeavingIndex(index);
    });
    if (!ok) setLeavingIndex(null);
  };

  // Rounding so all value boxes (incl. the pending new one) read as one field.
  const hasExtraRow = adding || pending !== null;
  const totalRows = elements.length + (hasExtraRow ? 1 : 0);
  const roundingFor = (i: number, isNewRow = false) => {
    if (totalRows <= 1) return "";
    const first = !isNewRow && i === 0;
    const last = isNewRow || (!hasExtraRow && i === elements.length - 1);
    if (first && last) return "";
    if (first) return "rounded-b-none";
    if (last) return "rounded-t-none";
    return "rounded-none";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          title={labelTitle}
          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground"
        >
          {/* Raw names get long (`----:com.apple.iTunes:…`); the name ellipsises,
              the value count stays put. */}
          <span className={cn("truncate", showRawTags && "font-mono")}>
            {label}
          </span>
          {isArray && (
            <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground/80">
              {elements.length + (pending ? 1 : 0)}
            </span>
          )}
        </label>
        {!isArray && (
          <button
            onClick={() => toggleRemove(0)}
            title="Remove this field"
            className={cn(
              "rounded p-0.5 text-destructive transition-colors hover:bg-destructive/10",
              removingIndex === 0 && "bg-destructive/10",
            )}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Value boxes render flush together to read as one field. */}
      <div className="flex flex-col">
        {elements.map((el, i) => (
          <ValueRow
            key={i}
            filePath={filePath}
            tagKey={tagKey}
            label={label}
            original={el}
            mut={mut}
            reload={reload}
            inArray={isArray}
            roundingClass={roundingFor(i)}
            offsetClass={i > 0 ? "-mt-px" : undefined}
            glow={armed && !hasExtraRow && i === elements.length - 1}
            marked={removingIndex === i}
            settled={settledValue !== null && el === settledValue}
            leaving={leavingIndex === i}
            onRemoveClick={() => toggleRemove(i)}
          />
        ))}
        {adding && (
          <NewValueRow
            onSubmit={submitAdd}
            onClose={() => setAdding(false)}
            roundingClass={roundingFor(elements.length, true)}
            offsetClass="-mt-px"
          />
        )}
        {pending && (
          <PendingValueRow
            value={pending.value}
            roundingClass={roundingFor(elements.length, true)}
            offsetClass="-mt-px"
          />
        )}
      </div>

      {/* One removal confirmation below the whole field — keeps the boxes intact. */}
      <Collapse open={removeTarget !== null}>
        <ScopeButtons
          label="Remove from:"
          onScope={startRemove}
          onCancel={() => setRemovingIndex(null)}
        />
      </Collapse>

      {/* Stays mounted (just inert) while a value is being added, so nothing
          below the field shifts when the add flow opens and closes. */}
      <AddValueHint
        disabled={hasExtraRow}
        onArmedChange={setArmed}
        onOpen={() => {
          setArmed(false);
          setAdding(true);
        }}
      />
    </div>
  );
}
