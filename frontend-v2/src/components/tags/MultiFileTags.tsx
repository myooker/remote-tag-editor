import * as React from "react";
import { Loader2, X, ChevronDown, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddFieldSection } from "./AddFieldSection";
import { TagPanelContextMenu } from "./TagPanelContextMenu";
import { CoverSection } from "./CoverSection";
import { useMultiTags } from "@/hooks/useTags";
import { usePrefs } from "@/context/PrefsContext";
import { useApp } from "@/context/AppContext";
import { forEachLimit } from "@/lib/concurrency";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useDialogs } from "@/hooks/useDialogs";
import { useHistoryPanel } from "@/context/HistoryContext";
import { mergeTags, distinctValues, firstScalar, isHiddenTag } from "@/lib/tags";
import { tagTooltip, type TagIndex } from "@/lib/tagRegistry";
import { cn } from "@/lib/utils";

interface MultiRow {
  id: string;
  /** Field identity: the display name, or the raw name when unregistered. */
  key: string;
  /** What the row is labelled with, per the raw/normalized toggle. */
  label: string;
  labelTitle: string;
  mode: "same" | "varied";
  initial: string; // "" for varied (<keep>)
  perFileOld: string[]; // aligned to filePaths
  /** Each file's raw tag name for this field — what its write must send. */
  perFileKey: (string | undefined)[];
  options: string[]; // dropdown values (varied)
}

/**
 * Flatten merged tags into editable rows aligned to filePaths. Rows are grouped
 * by field, so one row can cover files that spell the tag differently; each
 * file's raw name rides along in `perFileKey`.
 */
function buildRows(
  merged: ReturnType<typeof mergeTags>,
  index: TagIndex,
  showRaw: boolean,
): MultiRow[] {
  const rows: MultiRow[] = [];
  const labelOf = (field: (typeof merged)[number]) =>
    showRaw ? field.raws.join(" / ") : field.key;
  // Ordered by the normalized name in both modes, so flipping the toggle
  // relabels the rows in place instead of reshuffling them.
  const ordered = [...merged].sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { numeric: true }),
  );

  for (const field of ordered) {
    if (field.raws.every(isHiddenTag)) continue;
    // Several raw spellings under one name: show them all, there is no single
    // "the" raw name for the row.
    const label = labelOf(field);
    const labelTitle =
      field.raws.length === 1
        ? tagTooltip(index, field.raws[0], showRaw)
        : field.raws.join(" · ");

    if (field.kind === "same") {
      const elements = Array.isArray(field.value) ? field.value : [field.value];
      elements.forEach((el, i) => {
        rows.push({
          id: `${field.key}:${i}`,
          key: field.key,
          label,
          labelTitle,
          mode: "same",
          initial: el,
          perFileOld: field.perFile.map(() => el),
          perFileKey: field.perFileKey,
          options: [],
        });
      });
    } else {
      rows.push({
        id: field.key,
        key: field.key,
        label,
        labelTitle,
        mode: "varied",
        initial: "",
        perFileOld: field.perFile.map((v) => firstScalar(v)),
        perFileKey: field.perFileKey,
        options: distinctValues(field.perFile),
      });
    }
  }
  return rows;
}

export function MultiFileTags({ filePaths }: { filePaths: string[] }) {
  const { maps, reload } = useMultiTags(filePaths);
  const { writeLimit, showRawTags } = usePrefs();
  const { tagIndex } = useApp();
  const showThrobber = useDelayedFlag(!maps);
  const { toast } = useToast();
  const { confirm } = useDialogs();
  const { tagsRefreshToken } = useHistoryPanel();

  const skipFirstRefresh = React.useRef(true);
  React.useEffect(() => {
    if (skipFirstRefresh.current) {
      skipFirstRefresh.current = false;
      return;
    }
    reload();
  }, [tagsRefreshToken, reload]);

  const rows = React.useMemo(
    () => (maps ? buildRows(mergeTags(maps, tagIndex), tagIndex, showRawTags) : []),
    [maps, tagIndex, showRawTags],
  );

  /**
   * Run `op` over the selection. `targets` are indices into `filePaths`, so a
   * field-scoped write skips the files that don't carry the field instead of
   * sending them another file's raw tag name.
   */
  async function runAll(
    verb: string,
    targets: number[],
    op: (path: string, i: number) => Promise<unknown>,
  ) {
    const failed = await forEachLimit(targets, writeLimit, (i) =>
      op(filePaths[i], i),
    );
    const total = targets.length;
    if (total === 0) toast("No selected file has that field", "error");
    else if (failed === 0) toast(`${verb} ${total} file${total > 1 ? "s" : ""}`, "success");
    else toast(`${verb} ${total - failed}/${total}, ${failed} failed`, "error");
    reload();
  }

  /** Indices of the files that actually carry the row's field. */
  const targetsOf = (row: MultiRow) =>
    row.perFileKey.flatMap((key, i) => (key ? [i] : []));

  const saveAll = (row: MultiRow, newValue: string) =>
    runAll("Saved", targetsOf(row), (path, i) =>
      api.editTag({
        path,
        // Each file's own raw tag name — TPE1 for the mp3, ARTIST for the flac.
        tagType: row.perFileKey[i] as string,
        replaceWhat: row.perFileOld[i] ?? "",
        replaceWith: newValue,
      }),
    );

  const removeAll = async (row: MultiRow) => {
    const targets = targetsOf(row);
    const ok = await confirm({
      title: `Remove “${row.label}”?`,
      description: `This deletes the field from ${targets.length} of the ${filePaths.length} selected files.`,
      destructive: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    await runAll("Removed field from", targets, (path, i) =>
      api.removeField({
        path,
        fieldType: row.perFileKey[i] as string,
        value: row.perFileOld[i] ?? "",
      }),
    );
  };

  const addAll = (fieldType: string, value: string) =>
    runAll(
      "Added field to",
      filePaths.map((_, i) => i),
      (path) => api.addField({ path, fieldType, value: value || "none" }),
    );

  if (!maps) {
    return showThrobber ? (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <span className="text-sm">Loading tags for {filePaths.length} files…</span>
      </div>
    ) : null;
  }

  return (
    <TagPanelContextMenu
      onRemoveField={({ key }) => {
        const row = rows.find((r) => r.key === key);
        if (row) void removeAll(row);
      }}
    >
      <div className="flex flex-col">
        <CoverSection />

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Layers className="size-4" />
            Editing {filePaths.length} files. Fields that differ show{" "}
            <span className="font-mono">&lt;keep&gt;</span>.
          </div>

          <div className="flex flex-col gap-4">
            {rows.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No tags found
              </p>
            ) : (
              rows.map((row) => (
                <MultiTagRow
                  key={row.id}
                  row={row}
                  showRaw={showRawTags}
                  onSaveAll={(v) => saveAll(row, v)}
                  onRemoveAll={() => removeAll(row)}
                />
              ))
            )}
          </div>

          <AddFieldSection variant="multi" onAdd={(_scope, ft, v) => addAll(ft, v)} />
        </div>
      </div>
    </TagPanelContextMenu>
  );
}

function MultiTagRow({
  row,
  showRaw,
  onSaveAll,
  onRemoveAll,
}: {
  row: MultiRow;
  showRaw: boolean;
  onSaveAll: (value: string) => void | Promise<void>;
  onRemoveAll: () => void;
}) {
  const [draft, setDraft] = React.useState(row.initial);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setDraft(row.initial), [row.initial]);

  const isVaried = row.mode === "varied";
  const dirty = isVaried ? draft.trim() !== "" : draft !== row.initial;

  const filtered = React.useMemo(() => {
    const q = draft.trim().toLowerCase();
    return q ? row.options.filter((o) => o.toLowerCase().includes(q)) : row.options;
  }, [row.options, draft]);

  return (
    <div
      className="group/row flex flex-col gap-1.5"
      data-tag-key={row.key}
      data-tag-label={row.label}
      data-tag-value={row.perFileOld[0] ?? ""}
    >
      <div className="flex items-center justify-between gap-2">
        <label
          title={row.labelTitle}
          className={cn(
            "min-w-0 truncate text-xs font-semibold tracking-wide text-muted-foreground",
            showRaw && "font-mono",
          )}
        >
          {row.label}
        </label>
        <button
          onClick={onRemoveAll}
          title="Remove from all selected"
          className="rounded p-0.5 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover/row:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            value={draft}
            placeholder={isVaried ? "<keep>" : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              if (isVaried) setOpen(true);
            }}
            onFocus={() => isVaried && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            className={cn(isVaried && "pr-8")}
          />
          {isVaried && row.options.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen((o) => !o);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="size-4" />
            </button>
          )}
          {isVaried && open && filtered.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
              {filtered.map((opt) => (
                <button
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraft(opt);
                    setOpen(false);
                  }}
                  className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {dirty && (
        <div className="flex flex-wrap gap-2 pl-1">
          <Button size="xs" variant="success" onClick={() => onSaveAll(draft.trim())}>
            Save all
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDraft(row.initial)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
