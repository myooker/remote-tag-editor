import * as React from "react";
import { Loader2, X, ChevronDown, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddFieldSection } from "./AddFieldSection";
import { TagPanelContextMenu } from "./TagPanelContextMenu";
import { AlbumCover } from "./AlbumCover";
import { useMultiTags } from "@/hooks/useTags";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useDialogs } from "@/hooks/useDialogs";
import { useHistoryPanel } from "@/context/HistoryContext";
import {
  mergeTags,
  distinctValues,
  firstScalar,
  HIDDEN_TAGS,
} from "@/lib/tags";
import { cn } from "@/lib/utils";

interface MultiRow {
  id: string;
  key: string;
  mode: "same" | "varied";
  initial: string; // "" for varied (<keep>)
  perFileOld: string[]; // aligned to filePaths
  options: string[]; // dropdown values (varied)
}

/** Flatten merged tags into editable rows aligned to filePaths. */
function buildRows(
  merged: ReturnType<typeof mergeTags>,
  count: number,
): MultiRow[] {
  const rows: MultiRow[] = [];
  for (const [key, field] of Object.entries(merged)) {
    if (HIDDEN_TAGS.has(key)) continue;
    if (field.kind === "same") {
      const elements = Array.isArray(field.value) ? field.value : [field.value];
      elements.forEach((el, i) => {
        rows.push({
          id: `${key}:${i}`,
          key,
          mode: "same",
          initial: el,
          perFileOld: Array(count).fill(el),
          options: [],
        });
      });
    } else {
      rows.push({
        id: key,
        key,
        mode: "varied",
        initial: "",
        perFileOld: field.perFile.map((v) => firstScalar(v)),
        options: distinctValues(field.perFile),
      });
    }
  }
  return rows;
}

export function MultiFileTags({ filePaths }: { filePaths: string[] }) {
  const { maps, reload } = useMultiTags(filePaths);
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
    () => (maps ? buildRows(mergeTags(maps), filePaths.length) : []),
    [maps, filePaths.length],
  );

  async function runAll(
    verb: string,
    op: (path: string, i: number) => Promise<unknown>,
  ) {
    let failed = 0;
    for (let i = 0; i < filePaths.length; i++) {
      try {
        await op(filePaths[i], i);
      } catch {
        failed += 1;
      }
    }
    const total = filePaths.length;
    if (failed === 0) toast(`${verb} ${total} files`, "success");
    else toast(`${verb} ${total - failed}/${total}, ${failed} failed`, "error");
    reload();
  }

  const saveAll = (row: MultiRow, newValue: string) =>
    runAll("Saved", (path, i) =>
      api.editTag({
        path,
        tagType: row.key,
        replaceWhat: row.perFileOld[i] ?? "",
        replaceWith: newValue,
      }),
    );

  const removeAll = async (key: string, perFileOld: string[]) => {
    const ok = await confirm({
      title: `Remove “${key}”?`,
      description: `This deletes the field from all ${filePaths.length} selected files.`,
      destructive: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    await runAll("Removed field from", (path, i) =>
      api.removeField({ path, fieldType: key, value: perFileOld[i] ?? "" }),
    );
  };

  const addAll = (fieldType: string, value: string) =>
    runAll("Added field to", (path) =>
      api.addField({ path, fieldType, value: value || "none" }),
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
        if (row) void removeAll(key, row.perFileOld);
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <AlbumCover />
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Layers className="size-4" />
          Editing {filePaths.length} files. Fields that differ show{" "}
          <span className="font-mono">&lt;keep&gt;</span>.
        </div>

        <div className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No tags found</p>
          ) : (
            rows.map((row) => (
              <MultiTagRow
                key={row.id}
                row={row}
                onSaveAll={(v) => saveAll(row, v)}
                onRemoveAll={() => removeAll(row.key, row.perFileOld)}
              />
            ))
          )}
        </div>

        <AddFieldSection variant="multi" onAdd={(_scope, ft, v) => addAll(ft, v)} />
      </div>
    </TagPanelContextMenu>
  );
}

function MultiTagRow({
  row,
  onSaveAll,
  onRemoveAll,
}: {
  row: MultiRow;
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
      data-tag-value={row.perFileOld[0] ?? ""}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {row.key}
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
