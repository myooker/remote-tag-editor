import type {
  AppSettings,
  DirectoryTree,
  HistoryEntry,
  TagMap,
} from "./types";
import type { TagAliasMap } from "./tagRegistry";

// Same-origin: nginx serves the static build and proxies /api to the backend.
// In dev, Vite proxies /api to the backend (see vite.config.ts).
const API_BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function jsonGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new ApiError(await errorText(res), res.status);
  return res.json() as Promise<T>;
}

async function jsonPost(url: string, body: unknown): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await errorText(res), res.status);
  return res;
}

async function errorText(res: Response): Promise<string> {
  let msg = `HTTP ${res.status}`;
  try {
    const text = await res.text();
    if (text) msg += `: ${text}`;
  } catch {
    /* ignore */
  }
  return msg;
}

export const api = {
  getSettings: (signal?: AbortSignal) =>
    jsonGet<AppSettings>(`${API_BASE}/settings`, signal),

  getMountPoint: (signal?: AbortSignal) =>
    jsonGet<{ path: string }>(`${API_BASE}/getmntpoint`, signal),

  heartbeat: async (signal?: AbortSignal): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/heartbeat`, { signal });
    return res.ok;
  },

  listDir: (path: string, signal?: AbortSignal) =>
    jsonGet<DirectoryTree>(
      `${API_BASE}/list?path=${encodeURIComponent(path)}`,
      signal,
    ),

  getTags: (path: string, signal?: AbortSignal) =>
    jsonGet<TagMap>(`${API_BASE}/tag?path=${encodeURIComponent(path)}`, signal),

  /**
   * The normalization table: display name → raw tag spellings. Older builds
   * served a bare `string[]` of names; `buildTagIndex` accepts both.
   */
  getTagRegistry: (signal?: AbortSignal) =>
    jsonGet<TagAliasMap | string[]>(`${API_BASE}/tag-registry`, signal),

  getHistory: (identifier: string, signal?: AbortSignal) =>
    jsonGet<HistoryEntry[]>(
      `${API_BASE}/gethistory?identifier=${encodeURIComponent(identifier)}`,
      signal,
    ),

  editTag: (payload: {
    path: string;
    tagType: string;
    replaceWhat: string;
    replaceWith: string;
  }) => jsonPost(`${API_BASE}/edittag`, payload),

  addField: (payload: { path: string; fieldType: string; value: string }) =>
    jsonPost(`${API_BASE}/addfieldtag`, payload),

  removeField: (payload: { path: string; fieldType: string; value: string }) =>
    jsonPost(`${API_BASE}/removefieldtag`, payload),

  mkdir: (payload: { path: string; name: string }) =>
    jsonPost(`${API_BASE}/mkdir`, payload),

  rename: (payload: { path: string; newName: string }) =>
    jsonPost(`${API_BASE}/rename`, payload),

  undo: (entry: HistoryEntry) => jsonPost(`${API_BASE}/undo`, entry),

  /** Upload a single file into `dirPath` via multipart form data. */
  store: (dirPath: string, file: File, onProgress?: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append("path", dirPath);
      form.append("file", file, file.name);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/store`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress)
          onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new ApiError(xhr.responseText || `HTTP ${xhr.status}`, xhr.status));
      xhr.onerror = () => reject(new ApiError("Network error", 0));
      xhr.send(form);
    }),

  /**
   * Placeholder cover-art endpoint. The backend implementation is a work in
   * progress; the UI falls back to a placeholder when this 404s/500s.
   */
  albumCoverUrl: (path: string) =>
    `${API_BASE}/getalbumcover?path=${encodeURIComponent(path)}`,
};

export { ApiError };
