import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp, ArrowDown, FolderOpen, Loader2, SearchX } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { useExplorer } from "@/context/ExplorerContext";
import { useSearch } from "@/context/SearchContext";
import { fileTypeLabel, type SortColumn } from "@/lib/sort";
import { basename, cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const GRID = "grid grid-cols-[1fr_150px] items-center";

function SortHeader({
  label,
  column,
}: {
  label: string;
  column: SortColumn;
}) {
  const { sortColumn, sortDirection, toggleSort } = useExplorer();
  const active = sortColumn === column;
  return (
    <button
      onClick={() => toggleSort(column)}
      className={cn(
        "flex items-center gap-1 text-left transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      {active &&
        (sortDirection === "asc" ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        ))}
    </button>
  );
}

export function FileList() {
  const {
    nodes,
    currentPath,
    loadedPath,
    loading,
    error,
    selectedPaths,
    selection,
    selectIndex,
    goInto,
    toFullPath,
  } = useExplorer();
  const { query } = useSearch();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 14,
  });

  // Remember the scroll position per directory and restore it on return.
  const scrollPositions = React.useRef<Map<string, number>>(new Map());
  const activePathRef = React.useRef<string | null>(null);
  const restoringRef = React.useRef(false);

  const handleScroll = React.useCallback(() => {
    if (restoringRef.current) return; // ignore our own programmatic scroll
    const el = parentRef.current;
    if (el && activePathRef.current !== null) {
      scrollPositions.current.set(activePathRef.current, el.scrollTop);
    }
  }, []);

  // Once the NEW directory's rows are actually in the DOM (loadedPath caught up
  // to currentPath), restore its saved position — 0 for a folder we haven't
  // visited. Gating on loadedPath (not `loading`) matters: layout effects run
  // before the passive effect that flips `loading`, so `loading` is briefly
  // stale on nav and would restore against the previous directory's rows.
  React.useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el || loadedPath !== currentPath) return;
    if (activePathRef.current === currentPath) return;
    activePathRef.current = currentPath;
    restoringRef.current = true;
    el.scrollTop = currentPath ? (scrollPositions.current.get(currentPath) ?? 0) : 0;
    const id = requestAnimationFrame(() => {
      restoringRef.current = false;
    });
    return () => {
      cancelAnimationFrame(id);
      restoringRef.current = false;
    };
  }, [currentPath, loadedPath]);

  // Keep the keyboard-focused row in view.
  React.useEffect(() => {
    if (selection.lastIndex >= 0) {
      rowVirtualizer.scrollToIndex(selection.lastIndex, { align: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.lastIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Column header */}
      <div
        className={cn(
          GRID,
          "shrink-0 border-b border-border bg-card/40 px-3 py-2 text-xs font-medium",
        )}
      >
        <SortHeader label="Name" column="name" />
        <SortHeader label="Type" column="type" />
      </div>

      {/* Body */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-auto"
      >
        {error ? (
          <EmptyState icon={<SearchX className="size-8" />} title="Couldn’t load folder" subtitle={error} />
        ) : loading && nodes.length === 0 ? (
          <EmptyState icon={<Loader2 className="size-8 animate-spin" />} title="Loading…" />
        ) : nodes.length === 0 ? (
          query ? (
            <EmptyState icon={<SearchX className="size-8" />} title="No matches" subtitle={`Nothing matches “${query}”`} />
          ) : (
            <EmptyState icon={<FolderOpen className="size-8" />} title="This folder is empty" />
          )
        ) : (
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const node = nodes[vi.index];
              const fullPath = toFullPath(node);
              const selected = selectedPaths.has(fullPath);
              const name = basename(node.name);
              return (
                <div
                  key={fullPath}
                  data-index={vi.index}
                  onClick={(e) =>
                    selectIndex(vi.index, {
                      ctrl: e.ctrlKey || e.metaKey,
                      shift: e.shiftKey,
                    })
                  }
                  onDoubleClick={() => {
                    if (node.type === "directory") goInto(node);
                  }}
                  className={cn(
                    GRID,
                    "absolute left-0 top-0 w-full cursor-default select-none px-3 text-sm no-select",
                    "border-b border-border/40",
                    selected
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-accent/50",
                  )}
                  style={{
                    height: ROW_HEIGHT,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileIcon type={node.type} />
                    <span className="truncate" title={name}>
                      {name}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {fileTypeLabel(node)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <div className="opacity-60">{icon}</div>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {subtitle && <p className="max-w-sm text-xs">{subtitle}</p>}
    </div>
  );
}
