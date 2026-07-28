import { joinPath } from "./paths";

/**
 * A flattened, ordered upload plan derived from a drag-and-drop. Directories
 * become `mkdir` ops (emitted before their contents) so a dropped folder is
 * recreated on the backend before its files are stored into it.
 */
export type UploadOp =
  | { kind: "mkdir"; parent: string; name: string }
  | { kind: "file"; destDir: string; entry: FileSystemFileEntry };

/** Read every entry of a directory (readEntries returns in capped batches). */
function readAllEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  return new Promise((resolve, reject) => {
    const readBatch = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else {
          all.push(...batch);
          readBatch();
        }
      }, reject);
    readBatch();
  });
}

async function planEntry(
  entry: FileSystemEntry,
  destDir: string,
  ops: UploadOp[],
): Promise<void> {
  if (entry.isFile) {
    ops.push({ kind: "file", destDir, entry: entry as FileSystemFileEntry });
  } else if (entry.isDirectory) {
    ops.push({ kind: "mkdir", parent: destDir, name: entry.name });
    const childDir = joinPath(destDir, entry.name);
    for (const child of await readAllEntries(entry as FileSystemDirectoryEntry)) {
      await planEntry(child, childDir, ops);
    }
  }
}

/** Build an ordered plan for the dropped entries, rooted at `destDir`. */
export async function buildUploadPlan(
  entries: FileSystemEntry[],
  destDir: string,
): Promise<UploadOp[]> {
  const ops: UploadOp[] = [];
  for (const entry of entries) await planEntry(entry, destDir, ops);
  return ops;
}

export function entryToFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** Capture FileSystemEntry objects synchronously from a drop event. */
export function getDroppedEntries(dt: DataTransfer): FileSystemEntry[] {
  if (!dt.items || dt.items.length === 0) return [];
  const first = dt.items[0];
  if (typeof first.webkitGetAsEntry !== "function") return [];
  return Array.from(dt.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => e !== null);
}
