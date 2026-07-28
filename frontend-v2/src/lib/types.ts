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
