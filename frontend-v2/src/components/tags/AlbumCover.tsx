import * as React from "react";
import { Disc3, ImagePlus, ImageUp, Trash2, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Album-cover placeholder. GET /api/getalbumcover is a work-in-progress on the
 * backend, so we optimistically load it and fall back to a placeholder on error.
 *
 * The right-click menu and drag-and-drop are wired up as UI only — album-art
 * editing is not implemented on the backend yet, so the actions are stubs.
 */
export function AlbumCover({ path }: { path?: string }) {
  const [failed, setFailed] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => setFailed(false), [path]);

  const hasPicture = !!path && !failed;

  // TODO: wire up to the backend once album-art endpoints exist.
  const stub = (message: string) => toast(message, "info");

  const pickFile = () => fileInputRef.current?.click();

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stub(
        `“${file.name}” selected — ${hasPicture ? "replacing" : "adding"} cover art isn’t saved yet (backend pending)`,
      );
    }
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (hasPicture) return; // drop only replaces when there's no picture
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) {
      stub(`“${file.name}” dropped — cover art isn’t saved yet (backend pending)`);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onContextMenu={(e) => e.stopPropagation()}
          onDragOver={(e) => {
            if (!hasPicture && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border bg-gradient-to-br from-muted/60 to-muted/20 shadow-inner transition-colors",
            dragging
              ? "border-2 border-dashed border-primary bg-primary/10"
              : "border-border",
          )}
        >
          {hasPicture ? (
            <img
              src={api.albumCoverUrl(path!)}
              alt="Album cover"
              className="h-full w-full object-cover"
              onError={() => setFailed(true)}
              draggable={false}
            />
          ) : dragging ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-primary">
              <UploadCloud className="size-12" />
              <span className="text-xs font-medium">Drop image to add cover</span>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
              <Disc3 className="size-14 opacity-40" />
              <span className="text-xs opacity-70">No cover art</span>
              <span className="text-[10px] opacity-50">
                Drag &amp; drop or right-click
              </span>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {hasPicture ? (
          <>
            <ContextMenuItem onSelect={pickFile}>
              <ImageUp />
              Replace picture
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onSelect={() => stub("Delete cover art isn’t wired up yet (backend pending)")}
            >
              <Trash2 />
              Delete picture
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onSelect={pickFile}>
            <ImagePlus />
            Add picture
          </ContextMenuItem>
        )}
      </ContextMenuContent>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChosen}
      />
    </ContextMenu>
  );
}
