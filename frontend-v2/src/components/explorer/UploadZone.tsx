import * as React from "react";
import { UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { useExplorer } from "@/context/ExplorerContext";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { buildUploadPlan, entryToFile, getDroppedEntries } from "@/lib/upload";

type ExecOp =
  | { kind: "mkdir"; parent: string; name: string }
  | { kind: "file"; destDir: string; name: string; getFile: () => Promise<File> };

interface UploadProgress {
  total: number;
  done: number;
  current: string;
}

export function UploadZone({ children }: { children: React.ReactNode }) {
  const { currentPath, refresh } = useExplorer();
  const { toast } = useToast();
  const [dragging, setDragging] = React.useState(false);
  const dragDepth = React.useRef(0);
  const [progress, setProgress] = React.useState<UploadProgress | null>(null);

  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const destRoot = currentPath;
    if (!destRoot) return;

    // Capture entries synchronously — the DataTransfer is cleared after this tick.
    const entries = getDroppedEntries(e.dataTransfer);
    const flatFiles = Array.from(e.dataTransfer.files);

    let ops: ExecOp[];
    if (entries.length > 0) {
      // Recreate any dropped folders, then upload their files into them.
      const plan = await buildUploadPlan(entries, destRoot);
      ops = plan.map((op) =>
        op.kind === "mkdir"
          ? op
          : {
              kind: "file",
              destDir: op.destDir,
              name: op.entry.name,
              getFile: () => entryToFile(op.entry),
            },
      );
    } else {
      // Older browsers without the entry API: flat file list only.
      ops = flatFiles.map((f) => ({
        kind: "file",
        destDir: destRoot,
        name: f.name,
        getFile: () => Promise.resolve(f),
      }));
    }

    const fileCount = ops.reduce((n, op) => (op.kind === "file" ? n + 1 : n), 0);
    if (ops.length === 0) return;

    let done = 0;
    let failed = 0;
    setProgress({ total: fileCount, done: 0, current: "" });
    for (const op of ops) {
      if (op.kind === "mkdir") {
        // Ignore "already exists" — merge into the existing folder.
        try {
          await api.mkdir({ path: op.parent, name: op.name });
        } catch {
          /* folder may already exist */
        }
        continue;
      }
      setProgress({ total: fileCount, done, current: op.name });
      try {
        const file = await op.getFile();
        await api.store(op.destDir, file);
      } catch {
        failed += 1;
      }
      done += 1;
    }
    setProgress(null);

    if (fileCount === 0) {
      toast("Folder created", "success");
    } else if (failed === 0) {
      toast(`Uploaded ${fileCount} file${fileCount > 1 ? "s" : ""}`, "success");
    } else {
      toast(`Uploaded ${fileCount - failed}/${fileCount}, ${failed} failed`, "error");
    }
    refresh();
  };

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <UploadCloud className="size-10 text-primary" />
          <p className="text-sm font-medium">Drop files to upload here</p>
        </div>
      )}

      {progress && (
        <div className="absolute bottom-4 left-4 z-30 w-72 rounded-lg border border-border bg-popover p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <UploadCloud className="size-4 text-primary" />
              Uploading…
            </span>
            <button
              onClick={() => setProgress(null)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-primary transition-all")}
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span className="max-w-[70%] truncate">{progress.current}</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
