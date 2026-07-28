import * as React from "react";
import { FolderPlus, Pencil, Loader2 } from "lucide-react";
import { NavToolbar } from "./NavToolbar";
import { FileList } from "./FileList";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { useExplorer } from "@/context/ExplorerContext";
import { useFileActions } from "@/hooks/useFileActions";
import { basename } from "@/lib/utils";
import type { FileNode } from "@/lib/types";

export function FileExplorer({ connecting }: { connecting: boolean }) {
  const { nodes, selectIndex, clearSelection, goBack, goForward } = useExplorer();
  const { newFolder, rename } = useFileActions();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ctxNode, setCtxNode] = React.useState<FileNode | null>(null);

  // Mouse thumb buttons → browser-style history navigation.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        goForward();
      }
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseup", onUp);
    };
  }, [goBack, goForward]);

  // On right-click, select the row under the cursor (if any) so the menu acts
  // on it. Radix opens the menu; we just set the target + selection.
  const handleContextMenu = (e: React.MouseEvent) => {
    const rowEl = (e.target as HTMLElement).closest("[data-index]");
    if (rowEl) {
      const idx = Number(rowEl.getAttribute("data-index"));
      selectIndex(idx, { ctrl: false, shift: false });
      setCtxNode(nodes[idx] ?? null);
    } else {
      setCtxNode(null);
    }
  };

  // Left-clicking the empty area below the rows clears the selection.
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("[data-index]")) clearSelection();
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col border-r border-border"
    >
      <NavToolbar />

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="flex min-h-0 flex-1 flex-col"
            onContextMenu={handleContextMenu}
            onClick={handleBackgroundClick}
          >
            <FileList />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {ctxNode && (
            <>
              <ContextMenuLabel className="max-w-[16rem] truncate">
                {basename(ctxNode.name)}
              </ContextMenuLabel>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onSelect={() => void newFolder()}>
            <FolderPlus />
            New Folder
          </ContextMenuItem>
          {ctxNode && (
            <ContextMenuItem onSelect={() => void rename(ctxNode)}>
              <Pencil />
              Rename
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {connecting && (
        <div className="absolute inset-0 top-11 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Waiting for the backend…</p>
        </div>
      )}
    </div>
  );
}
