import { api } from "@/lib/api";
import { useExplorer } from "@/context/ExplorerContext";
import { useToast } from "@/components/ui/toast";

/**
 * Tag write operations for the single-file editor, in both "this file" and
 * "whole folder" scopes. Each resolves after reloading and shows a toast.
 *
 * Every operation resolves to whether it succeeded, so callers can hold a
 * transitional UI (a pending value box, a "saving" row) in place until the
 * write actually lands instead of tearing it down on click.
 */
export function useTagMutations(reload: () => void) {
  const { folderMusicPaths } = useExplorer();
  const { toast } = useToast();

  async function runFolder(
    verb: string,
    op: (path: string) => Promise<unknown>,
  ): Promise<boolean> {
    if (folderMusicPaths.length === 0) {
      toast("No music files in this folder", "error");
      return false;
    }
    let failed = 0;
    for (const path of folderMusicPaths) {
      try {
        await op(path);
      } catch {
        failed += 1;
      }
    }
    const total = folderMusicPaths.length;
    if (failed === 0) toast(`${verb} ${total} file${total > 1 ? "s" : ""}`, "success");
    else toast(`${verb} ${total - failed}/${total}, ${failed} failed`, "error");
    reload();
    return failed < total;
  }

  return {
    async editFile(
      filePath: string,
      tagType: string,
      replaceWhat: string,
      replaceWith: string,
    ): Promise<boolean> {
      if (!replaceWith.trim()) {
        toast("Tag value cannot be empty", "error");
        return false;
      }
      try {
        await api.editTag({ path: filePath, tagType, replaceWhat, replaceWith });
        toast("Tag saved", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to save: ${(err as Error).message}`, "error");
        return false;
      }
    },

    editFolder(tagType: string, replaceWhat: string, replaceWith: string) {
      if (!replaceWith.trim()) {
        toast("Tag value cannot be empty", "error");
        return Promise.resolve(false);
      }
      return runFolder("Saved", (path) =>
        api.editTag({ path, tagType, replaceWhat, replaceWith }),
      );
    },

    async removeFile(
      filePath: string,
      fieldType: string,
      value: string,
    ): Promise<boolean> {
      try {
        await api.removeField({ path: filePath, fieldType, value });
        toast("Field removed", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to remove: ${(err as Error).message}`, "error");
        return false;
      }
    },

    removeFolder(fieldType: string, value: string) {
      return runFolder("Removed field from", (path) =>
        api.removeField({ path, fieldType, value }),
      );
    },

    async addFile(
      filePath: string,
      fieldType: string,
      value: string,
    ): Promise<boolean> {
      try {
        await api.addField({ path: filePath, fieldType, value: value || "none" });
        toast("Field added", "success");
        reload();
        return true;
      } catch (err) {
        toast(`Failed to add field: ${(err as Error).message}`, "error");
        return false;
      }
    },

    addFolder(fieldType: string, value: string) {
      return runFolder("Added field to", (path) =>
        api.addField({ path, fieldType, value: value || "none" }),
      );
    },
  };
}
