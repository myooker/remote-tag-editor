import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useExplorer } from "@/context/ExplorerContext";
import { usePrefs } from "@/context/PrefsContext";
import { forEachLimit } from "@/lib/concurrency";
import { rawKeyIn } from "@/lib/tagRegistry";
import { useToast } from "@/components/ui/toast";

/**
 * Tag write operations for the single-file editor, in both "this file" and
 * "whole folder" scopes. Each resolves after reloading and shows a toast.
 *
 * Every operation resolves to whether it succeeded, so callers can hold a
 * transitional UI (a pending value box, a "saving" row) in place until the
 * write actually lands instead of tearing it down on click.
 *
 * `tagType`/`fieldType` here is always a **raw** tag name — the one the edited
 * file reported. Folder-scope writes re-resolve it per file (see `rawIn`),
 * because a frame ID read off an mp3 means nothing to a flac.
 */
export function useTagMutations(reload: () => void) {
  const { folderMusicPaths } = useExplorer();
  const { writeLimit } = usePrefs();
  const { tagIndex } = useApp();
  const { toast } = useToast();

  /**
   * The raw tag name `path` uses for the field `key` denotes. The file's own
   * tag map is the authority; `undefined` means it has no such field, so the
   * caller skips it rather than writing a foreign spelling.
   */
  async function rawIn(path: string, key: string): Promise<string | undefined> {
    try {
      return rawKeyIn(tagIndex, await api.getTags(path), key);
    } catch {
      return undefined;
    }
  }

  async function runFolder(
    verb: string,
    op: (path: string) => Promise<unknown>,
  ): Promise<boolean> {
    if (folderMusicPaths.length === 0) {
      toast("No music files in this folder", "error");
      return false;
    }
    const failed = await forEachLimit(folderMusicPaths, writeLimit, op);
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
      return runFolder("Saved", async (path) => {
        const raw = await rawIn(path, tagType);
        if (!raw) return;
        return api.editTag({ path, tagType: raw, replaceWhat, replaceWith });
      });
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
      return runFolder("Removed field from", async (path) => {
        const raw = await rawIn(path, fieldType);
        if (!raw) return;
        return api.removeField({ path, fieldType: raw, value });
      });
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

    /**
     * Adding a value to a field that already exists in the file uses that
     * file's raw name; for a field it doesn't have yet, `fieldType` goes
     * through as typed and the backend resolves it.
     */
    addFolder(fieldType: string, value: string) {
      return runFolder("Added field to", async (path) => {
        const raw = (await rawIn(path, fieldType)) ?? fieldType;
        return api.addField({ path, fieldType: raw, value: value || "none" });
      });
    },
  };
}
