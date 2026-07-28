import { api } from "@/lib/api";
import { basename } from "@/lib/utils";
import type { FileNode } from "@/lib/types";
import { useExplorer } from "@/context/ExplorerContext";
import { useDialogs } from "@/hooks/useDialogs";
import { useToast } from "@/components/ui/toast";

export function useFileActions() {
  const { currentPath, toFullPath, refresh } = useExplorer();
  const { prompt } = useDialogs();
  const { toast } = useToast();

  async function newFolder() {
    if (!currentPath) return;
    const name = await prompt({
      title: "New folder",
      label: "Folder name",
      placeholder: "Untitled folder",
      confirmLabel: "Create",
    });
    if (!name) return;
    try {
      await api.mkdir({ path: currentPath, name });
      toast(`Created “${name}”`, "success");
      refresh();
    } catch (err) {
      toast(`Failed to create folder: ${(err as Error).message}`, "error");
    }
  }

  async function rename(node: FileNode) {
    const current = basename(node.name);
    const newName = await prompt({
      title: "Rename",
      label: "New name",
      defaultValue: current,
      confirmLabel: "Rename",
    });
    if (!newName || newName === current) return;
    try {
      await api.rename({ path: toFullPath(node), newName });
      toast(`Renamed to “${newName}”`, "success");
      refresh();
    } catch (err) {
      toast(`Failed to rename: ${(err as Error).message}`, "error");
    }
  }

  return { newFolder, rename };
}
