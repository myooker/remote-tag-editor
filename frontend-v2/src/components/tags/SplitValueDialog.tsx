import * as React from "react";
import { Scissors, ArrowRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagRegistryInput } from "./TagRegistryInput";
import { api } from "@/lib/api";
import { useExplorer } from "@/context/ExplorerContext";
import { usePrefs } from "@/context/PrefsContext";
import { useApp } from "@/context/AppContext";
import { displayTag, rawKeyIn } from "@/lib/tagRegistry";
import { forEachLimit } from "@/lib/concurrency";
import { useToast } from "@/components/ui/toast";
import {
  DELIM_PRESETS,
  splitByRegex,
  customRegex,
  detectPreset,
  pluralField,
} from "@/lib/splitValue";
import { cn } from "@/lib/utils";
import type { TagMap } from "@/lib/types";

function toStrings(raw: TagMap[string] | undefined): string[] {
  if (raw === undefined || raw === null) return [];
  return Array.isArray(raw) ? raw.map(String) : [String(raw)];
}

export function SplitValueDialog({
  open,
  onOpenChange,
  filePath,
  sourceKey,
  sourceLabel,
  value,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  /** Raw tag name of the value being split — used for every write. */
  sourceKey: string;
  /** Display name for that tag. */
  sourceLabel: string;
  value: string;
  reload: () => void;
}) {
  const { folderMusicPaths } = useExplorer();
  const { writeLimit } = usePrefs();
  const { tagIndex } = useApp();
  const { toast } = useToast();

  // Suggest the plural of the *display* name ("Artist" → "Artists"); pluralising
  // a raw frame ID would propose nonsense like "TPE1S". The plural is fed back
  // through the registry so the suggestion is a name the backend recognises.
  const [target, setTarget] = React.useState(() =>
    displayTag(tagIndex, pluralField(displayTag(tagIndex, sourceKey))),
  );
  const [delimMode, setDelimMode] = React.useState(() => detectPreset(value));
  const [customDelim, setCustomDelim] = React.useState("");
  const [keepOriginal, setKeepOriginal] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const regex = React.useMemo(() => {
    if (delimMode === "custom") {
      return customDelim ? customRegex(customDelim) : null;
    }
    return DELIM_PRESETS.find((d) => d.id === delimMode)?.regex ?? null;
  }, [delimMode, customDelim]);

  const parts = React.useMemo(
    () => (regex ? splitByRegex(value, regex) : [value]),
    [value, regex],
  );
  const canApply = !!target.trim() && parts.length >= 2 && !busy;

  const apply = async (scope: "file" | "folder") => {
    if (!regex) return;
    const field = target.trim();
    setBusy(true);
    try {
      if (scope === "file") {
        for (const part of parts) {
          await api.addField({ path: filePath, fieldType: field, value: part });
        }
        if (!keepOriginal) {
          await api.removeField({ path: filePath, fieldType: sourceKey, value });
        }
        toast(`Split into ${parts.length} values`, "success");
      } else {
        // Folder: split each file's OWN value(s) for this field. Files run up to
        // `writeLimit` at a time; the writes within one file stay sequential.
        let touched = 0;
        const failed = await forEachLimit(
          folderMusicPaths,
          writeLimit,
          async (path) => {
            const tags = await api.getTags(path);
            // Each file spells the source field its own way (TCON / GENRE /
            // ©gen); ask the file rather than reusing the mp3's frame ID.
            const rawKey = rawKeyIn(tagIndex, tags, sourceKey);
            if (!rawKey) return;
            const sources = toStrings(tags[rawKey]);
            const fileParts = [
              ...new Set(sources.flatMap((s) => splitByRegex(s, regex))),
            ];
            if (fileParts.length < 2) return;
            for (const part of fileParts) {
              await api.addField({ path, fieldType: field, value: part });
            }
            if (!keepOriginal) {
              for (const s of sources) {
                await api.removeField({ path, fieldType: rawKey, value: s });
              }
            }
            touched += 1;
          },
        );
        toast(
          failed === 0
            ? `Split ${sourceLabel} in ${touched} file(s)`
            : `Split ${touched} file(s), ${failed} failed`,
          failed === 0 ? "success" : "error",
        );
      }
      onOpenChange(false);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="size-4 text-primary" />
            Split “{sourceLabel}” into multiple values
          </DialogTitle>
          <DialogDescription className="break-words font-mono text-xs">
            {value}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Delimiter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Split on</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {DELIM_PRESETS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDelimMode(d.id)}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                    delimMode === d.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d.label}
                </button>
              ))}
              <button
                onClick={() => setDelimMode("custom")}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  delimMode === "custom"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                Custom
              </button>
              {delimMode === "custom" && (
                <Input
                  autoFocus
                  value={customDelim}
                  onChange={(e) => setCustomDelim(e.target.value)}
                  placeholder="e.g.  ; "
                  className="h-8 w-24 font-mono"
                />
              )}
            </div>
          </div>

          {/* Target field */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Into field
            </span>
            <TagRegistryInput
              value={target}
              onChange={setTarget}
              placeholder="e.g. Artists"
            />
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Preview ({parts.length} value{parts.length === 1 ? "" : "s"})
            </span>
            {parts.length >= 2 ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 p-2">
                {parts.map((p, i) => (
                  <span
                    key={`${i}:${p}`}
                    className="rounded bg-background px-2 py-0.5 text-xs shadow-sm"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                This delimiter doesn’t split the value into multiple parts.
              </p>
            )}
          </div>

          {/* Keep original */}
          <button
            onClick={() => setKeepOriginal((k) => !k)}
            className="flex items-center gap-2 self-start text-xs text-muted-foreground"
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded border transition-colors",
                keepOriginal
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {keepOriginal && <Check className="size-3" />}
            </span>
            Keep the original “{sourceLabel}” value
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {sourceLabel}
            <ArrowRight className="size-3" />
            <span className="font-medium text-foreground">{target || "—"}</span>
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => apply("file")} disabled={!canApply}>
              Apply to file
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={() => apply("folder")}
              disabled={!canApply}
            >
              Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
