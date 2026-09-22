export type NodeType = "directory" | "music" | "picture" | "file";

export interface FileNode {
  name: string;
  type: NodeType;
  extension?: string;
  /** Only present on directories; empty unless expanded past the depth limit. */
  content?: FileNode[];
  /** Not currently emitted by the backend tree; shown as "—" when absent. */
  size?: number;
}

export interface DirectoryTree {
  name: string;
  type: "directory";
  content: FileNode[];
  /** Absolute path this tree was built for; a file request resolves to its parent. */
  path?: string;
  /**
   * Entries in the directory as a whole (`/api/list-v2`). Equal to
   * `content.length` while we fetch with `limit=0`; kept separate so a switch
   * to server-side paging doesn't have to touch every consumer.
   */
  total?: number;
}

/**
 * Wire shape of `/api/list-v2`. Flat and pre-sorted, unlike the nested tree the
 * old `/api/list` returned. Adapted to `DirectoryTree` in `lib/api.ts` so the
 * rest of the app keeps a single internal model.
 */
export interface ListV2Entity {
  name: string;
  /** Backend spelling: "directory" | "music-file" | "picture-file" | "file". */
  type: string;
  extension?: string;
  size?: number;
}

export interface ListV2Response {
  path: string;
  total: number;
  offset: number;
  limit: number;
  entities: ListV2Entity[];
}

export interface AppSettings {
  rteid: boolean;
  mountpoint: string;
  version: string;
}

/** A tag value is either a single value or a multi-valued list (ARTISTS, etc.). */
export type TagValue = string | string[];
export type TagMap = Record<string, TagValue>;

export type HistoryAction = "add" | "remove" | "change";

export interface HistoryEntry {
  id: number;
  path: string;
  rteid: string;
  action: HistoryAction | string;
  tag: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

/** A file selected in the explorer. `path` is the absolute mount-point path. */
export interface SelectedFile {
  path: string;
  name: string;
  type: NodeType;
  extension?: string;
}
