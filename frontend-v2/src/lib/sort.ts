import type { FileNode } from "./types";
import { basename, naturalCompare } from "./utils";

export type SortColumn = "name" | "type";
export type SortDirection = "asc" | "desc";

const TYPE_LABEL: Record<string, string> = {
  directory: "Folder",
  music: "Audio File",
  picture: "Image",
};

export function fileTypeLabel(node: FileNode): string {
  if (TYPE_LABEL[node.type]) return TYPE_LABEL[node.type];
  if (node.extension) return `${node.extension.replace(/^\./, "").toUpperCase()} File`;
  return "File";
}

const TYPE_PRIORITY: Record<string, number> = {
  directory: 0,
  music: 1,
  picture: 2,
};
const priority = (node: FileNode) => TYPE_PRIORITY[node.type] ?? 3;

/**
 * Sort nodes for display. Directories are always grouped first; within a group
 * the chosen column + direction applies. Uses a natural comparator so
 * "Track 2" sorts before "Track 10".
 */
export function sortNodes(
  nodes: FileNode[],
  column: SortColumn,
  direction: SortDirection,
): FileNode[] {
  const dir = direction === "asc" ? 1 : -1;
  const sorted = [...nodes];

  sorted.sort((a, b) => {
    const isADir = a.type === "directory" ? 0 : 1;
    const isBDir = b.type === "directory" ? 0 : 1;
    if (isADir !== isBDir) return isADir - isBDir;

    if (column === "type") {
      const pa = priority(a);
      const pb = priority(b);
      if (pa !== pb) return (pa - pb) * dir;
      const labelCmp = naturalCompare(fileTypeLabel(a), fileTypeLabel(b));
      if (labelCmp !== 0) return labelCmp * dir;
      return naturalCompare(basename(a.name), basename(b.name));
    }

    // column === "name"
    return naturalCompare(basename(a.name), basename(b.name)) * dir;
  });

  return sorted;
}
