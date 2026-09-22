import * as React from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { api } from "@/lib/api";
import type { DirectoryTree, FileNode, SelectedFile } from "@/lib/types";
import {
  absolutePath,
  pathnameToSegments,
  segmentsToPathname,
  relativeSegments,
  joinPath,
} from "@/lib/paths";
import type { SortColumn, SortDirection } from "@/lib/sort";
import { basename } from "@/lib/utils";
import { useApp } from "./AppContext";
import { usePrefs } from "./PrefsContext";
import { useSearch } from "./SearchContext";
import { useToast } from "@/components/ui/toast";

interface Selection {
  files: SelectedFile[];
  lastIndex: number;
}

interface ExplorerContextValue {
  // Location
  segments: string[];
  currentPath: string | null;
  // Directory data
  tree: DirectoryTree | null;
  /** The path `tree`/`nodes` were actually loaded for (lags currentPath while loading). */
  loadedPath: string | null;
  /** The nodes actually shown — one page when paging is on. Selection indices are relative to this. */
  nodes: FileNode[];
  loading: boolean;
  error: string | null;
  // Paging (client-side: the whole directory is fetched, then sliced)
  /** Whether the list is being split into pages at all. */
  paginated: boolean;
  /** Zero-based index of the visible page. */
  page: number;
  pageCount: number;
  /** Absolute index of `nodes[0]` within the full filtered list. */
  pageStart: number;
  /** Entries after sort + search, across the whole directory. */
  filteredCount: number;
  setPage: (page: number) => void;
  // Navigation
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  goInto: (node: FileNode) => void;
  goToSegments: (segments: string[]) => void;
  goBack: () => void;
  goForward: () => void;
  goUp: () => void;
  refresh: () => void;
  // Sorting
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  toggleSort: (column: SortColumn) => void;
  // Selection
  selection: Selection;
  selectedPaths: Set<string>;
  selectIndex: (index: number, opts: { ctrl: boolean; shift: boolean }) => void;
  moveSelection: (delta: number, shift: boolean) => void;
  selectAllMusic: () => Promise<void>;
  clearSelection: () => void;
  toFullPath: (node: FileNode) => string;
  /**
   * Absolute paths of every music file in the current directory, unfiltered and
   * across every page. Async because a paged response only carries one page —
   * it fetches the full listing when it doesn't already have it, and caches it
   * for the directory.
   */
  getFolderMusicPaths: () => Promise<string[]>;
}

const ExplorerContext = React.createContext<ExplorerContextValue | null>(null);

export function useExplorer(): ExplorerContextValue {
  const ctx = React.useContext(ExplorerContext);
  if (!ctx) throw new Error("useExplorer must be used within <ExplorerProvider>");
  return ctx;
}

function toSelectedFile(node: FileNode, currentPath: string): SelectedFile {
  return {
    path: joinPath(currentPath, node.name),
    name: node.name,
    type: node.type,
    extension: node.extension,
  };
}

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  const { mountPoint } = useApp();
  const { query } = useSearch();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();

  const segments = React.useMemo(
    () => pathnameToSegments(location.pathname),
    [location.pathname],
  );
  const currentPath = mountPoint ? absolutePath(mountPoint, segments) : null;

  // --- Back / forward availability, derived from the router history index ---
  const [histIdx, setHistIdx] = React.useState(
    () => (window.history.state?.idx as number | undefined) ?? 0,
  );
  const [maxIdx, setMaxIdx] = React.useState(histIdx);
  React.useEffect(() => {
    const idx = (window.history.state?.idx as number | undefined) ?? 0;
    setHistIdx(idx);
    // A PUSH wipes any forward history; POP/REPLACE keep the known maximum.
    setMaxIdx((prev) => (navType === "PUSH" ? idx : Math.max(prev, idx)));
  }, [location.key, navType]);

  const canGoBack = histIdx > 0;
  const canGoForward = histIdx < maxIdx;
  const canGoUp = segments.length > 0;

  // --- Paging ---
  // The backend has no search parameter, so a search can only be applied here.
  // Filtering one page would only ever surface the matches that happened to
  // land on it, so searching falls back to pulling the whole directory; paging
  // then happens locally over the matches.
  const { paginate, pageSize } = usePrefs();
  const [page, setPageState] = React.useState(0);
  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  const wantAll = !paginate || searching;
  // Built from the raw page number, not the clamped one: the clamp depends on
  // a total this request hasn't fetched yet. An out-of-range page corrects
  // itself once the response lands.
  const reqOffset = wantAll ? 0 : page * pageSize;
  const reqLimit = wantAll ? 0 : pageSize;
  // Set when an arrow key walks off the edge of a server-paged list: the
  // neighbouring page has to arrive before there is a row to land on.
  const pendingEdge = React.useRef<"first" | "last" | null>(null);

  // --- Sorting ---
  // Kept as one object so toggleSort is a single pure updater. (Calling
  // setSortDirection inside a setSortColumn updater double-fired under
  // StrictMode and cancelled the flip.)
  const [sort, setSort] = React.useState<{
    column: SortColumn;
    direction: SortDirection;
  }>({ column: "name", direction: "asc" });
  const sortColumn = sort.column;
  const sortDirection = sort.direction;

  // --- Directory data ---
  const [tree, setTree] = React.useState<DirectoryTree | null>(null);
  const [loadedPath, setLoadedPath] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selection, setSelection] = React.useState<Selection>({
    files: [],
    lastIndex: -1,
  });
  const [refreshToken, setRefreshToken] = React.useState(0);
  const loadToken = React.useRef(0);

  // Selection is keyed by path, so it survives a page change or a re-sort —
  // only moving to a different directory invalidates it.
  React.useEffect(() => {
    setSelection({ files: [], lastIndex: -1 });
  }, [currentPath]);

  React.useEffect(() => {
    if (!currentPath) return;
    const token = ++loadToken.current;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    api
      .listDir(currentPath, controller.signal, {
        offset: reqOffset,
        limit: reqLimit,
        sort: sortColumn,
        asc: sortDirection === "asc",
      })
      .then((data) => {
        if (token !== loadToken.current) return;
        // A path pointing at a file is answered with its parent directory, so the
        // location has to follow — otherwise the breadcrumb claims we are inside
        // the file. Replacing the entry re-runs this effect for the real path.
        if (mountPoint && data.path) {
          // Compared as decoded segments: a difference here always changes
          // currentPath, so the effect is guaranteed to run again.
          const resolved = relativeSegments(mountPoint, data.path);
          if (resolved.join("/") !== segments.join("/")) {
            navigate(segmentsToPathname(resolved), { replace: true });
            return;
          }
        }
        setTree(data);
        setLoadedPath(currentPath);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || token !== loadToken.current) return;
        setError(err.message ?? "Failed to load directory");
        setTree(null);
        setLoading(false);
        toast(`Failed to load directory: ${err.message}`, "error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, refreshToken, reqOffset, reqLimit, sortColumn, sortDirection]);

  React.useEffect(() => {
    const edge = pendingEdge.current;
    if (!edge || !tree || !currentPath) return;
    pendingEdge.current = null;
    const list = tree.content;
    if (list.length === 0) return;
    const index = edge === "first" ? 0 : list.length - 1;
    setSelection({
      files: [toSelectedFile(list[index], currentPath)],
      lastIndex: index,
    });
  }, [tree, currentPath]);

  // The response is already sorted by the backend, so only the search is left
  // to apply — and `wantAll` guarantees the full directory is in hand when it
  // runs.
  const content = React.useMemo(() => tree?.content ?? [], [tree]);
  const filteredNodes = React.useMemo(
    () =>
      searching
        ? content.filter((n) =>
            basename(n.name).toLowerCase().includes(trimmedQuery),
          )
        : content,
    [content, searching, trimmedQuery],
  );

  // When the server paged for us, `tree.total` counts the whole directory and
  // `content` is just this page. When we hold everything, the filtered length
  // is the truth — it accounts for the search the backend can't do.
  const filteredCount = wantAll ? filteredNodes.length : (tree?.total ?? 0);
  const pageCount = paginate
    ? Math.max(1, Math.ceil(filteredCount / pageSize))
    : 1;
  // A narrowing search, a delete or a smaller folder can strand us past the
  // last page; render the clamped value rather than an empty list.
  const safePage = Math.min(page, pageCount - 1);
  React.useEffect(() => {
    if (page !== safePage) setPageState(safePage);
  }, [page, safePage]);

  // Navigating, searching or re-sorting reorders everything, so the old page
  // number no longer points at what the user was looking at.
  React.useEffect(() => {
    setPageState(0);
  }, [currentPath, trimmedQuery, sortColumn, sortDirection]);

  const pageStart = paginate ? safePage * pageSize : 0;

  // Slice only when we fetched more than a page; a server-paged response IS
  // the page.
  const nodes = React.useMemo(
    () =>
      paginate && wantAll
        ? filteredNodes.slice(pageStart, pageStart + pageSize)
        : filteredNodes,
    [filteredNodes, paginate, wantAll, pageStart, pageSize],
  );

  const setPage = React.useCallback(
    (next: number) => setPageState(Math.max(0, next)),
    [],
  );

  const toggleSort = React.useCallback((column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }, []);

  // --- Navigation actions ---
  const goToSegments = React.useCallback(
    (segs: string[]) => navigate(segmentsToPathname(segs)),
    [navigate],
  );
  const goInto = React.useCallback(
    (node: FileNode) => {
      if (node.type !== "directory") return;
      navigate(segmentsToPathname([...segments, basename(node.name)]));
    },
    [navigate, segments],
  );
  const goBack = React.useCallback(() => {
    if (histIdx > 0) navigate(-1);
  }, [navigate, histIdx]);
  const goForward = React.useCallback(() => {
    if (histIdx < maxIdx) navigate(1);
  }, [navigate, histIdx, maxIdx]);
  const goUp = React.useCallback(() => {
    if (segments.length > 0) navigate(segmentsToPathname(segments.slice(0, -1)));
  }, [navigate, segments]);
  const refresh = React.useCallback(() => setRefreshToken((t) => t + 1), []);

  // Folder-wide actions ("apply to whole folder", "select all music") need
  // every entry, but a server-paged response only carries one page. Fetch the
  // full listing on demand and keep it for the directory, so a run of folder
  // operations costs one extra request, not one per action.
  const allCache = React.useRef<{ path: string; nodes: FileNode[] } | null>(null);
  React.useEffect(() => {
    allCache.current = null;
  }, [currentPath, refreshToken]);

  const fetchAllNodes = React.useCallback(async (): Promise<FileNode[]> => {
    if (!currentPath) return [];
    // Not paging, or searching: `content` already is the whole directory.
    if (wantAll && loadedPath === currentPath) return content;
    if (allCache.current?.path === currentPath) return allCache.current.nodes;
    const data = await api.listDir(currentPath, undefined, {
      limit: 0,
      sort: sortColumn,
      asc: sortDirection === "asc",
    });
    allCache.current = { path: currentPath, nodes: data.content };
    return data.content;
  }, [currentPath, wantAll, loadedPath, content, sortColumn, sortDirection, refreshToken]);

  // --- Selection ---
  const selectedPaths = React.useMemo(
    () => new Set(selection.files.map((f) => f.path)),
    [selection.files],
  );

  const selectIndex = React.useCallback(
    (index: number, opts: { ctrl: boolean; shift: boolean }) => {
      if (!currentPath) return;
      const node = nodes[index];
      if (!node) return;
      const asFile = toSelectedFile(node, currentPath);

      setSelection((prev) => {
        // Ctrl+click: toggle
        if (opts.ctrl && !opts.shift) {
          const exists = prev.files.some((f) => f.path === asFile.path);
          return {
            files: exists
              ? prev.files.filter((f) => f.path !== asFile.path)
              : [...prev.files, asFile],
            lastIndex: index,
          };
        }
        // Shift+click: range from lastIndex
        if (opts.shift && prev.lastIndex !== -1) {
          const start = Math.min(prev.lastIndex, index);
          const end = Math.max(prev.lastIndex, index);
          const range: SelectedFile[] = [];
          for (let i = start; i <= end; i++) {
            const n = nodes[i];
            if (n) range.push(toSelectedFile(n, currentPath));
          }
          const base = opts.ctrl ? prev.files : [];
          const seen = new Set(base.map((f) => f.path));
          const merged = [...base];
          for (const f of range) if (!seen.has(f.path)) merged.push(f);
          return { files: merged, lastIndex: index };
        }
        // Plain click: select only
        return { files: [asFile], lastIndex: index };
      });
    },
    [nodes, currentPath],
  );

  const moveSelection = React.useCallback(
    (delta: number, shift: boolean) => {
      if (!currentPath || nodes.length === 0) return;

      const commit = (node: FileNode, index: number) => {
        const asFile = toSelectedFile(node, currentPath);
        setSelection((prev) => {
          if (!shift) return { files: [asFile], lastIndex: index };
          const exists = prev.files.some((f) => f.path === asFile.path);
          return {
            files: exists ? prev.files : [...prev.files, asFile],
            lastIndex: index,
          };
        });
      };

      // Server-paged: only this page is in memory. Walking off either edge has
      // to fetch the neighbouring page and land once it arrives.
      if (!wantAll) {
        const next =
          selection.lastIndex === -1
            ? delta > 0
              ? 0
              : nodes.length - 1
            : selection.lastIndex + delta;

        if (next < 0 && safePage > 0) {
          pendingEdge.current = "last";
          setPageState(safePage - 1);
          return;
        }
        if (next >= nodes.length && safePage < pageCount - 1) {
          pendingEdge.current = "first";
          setPageState(safePage + 1);
          return;
        }
        const index = Math.max(0, Math.min(nodes.length - 1, next));
        const node = nodes[index];
        if (node) commit(node, index);
        return;
      }

      // Everything is in memory: walk absolute indices across the whole
      // filtered list and flip the page locally if the target is on another.
      const absPrev =
        selection.lastIndex === -1 ? -1 : pageStart + selection.lastIndex;
      const abs =
        absPrev === -1
          ? delta > 0
            ? 0
            : filteredNodes.length - 1
          : Math.max(0, Math.min(filteredNodes.length - 1, absPrev + delta));

      const node = filteredNodes[abs];
      if (!node) return;

      const targetPage = paginate ? Math.floor(abs / pageSize) : 0;
      if (targetPage !== safePage) setPageState(targetPage);
      commit(node, paginate ? abs - targetPage * pageSize : abs);
    },
    [
      nodes,
      filteredNodes,
      currentPath,
      selection.lastIndex,
      wantAll,
      paginate,
      pageSize,
      pageStart,
      pageCount,
      safePage,
    ],
  );

  const selectAllMusic = React.useCallback(async () => {
    if (!currentPath) return;
    // Spans every page — selection is tracked by path, so it survives paging.
    const all = await fetchAllNodes();
    const pool = searching
      ? all.filter((n) => basename(n.name).toLowerCase().includes(trimmedQuery))
      : all;
    const music = pool.filter((n) => n.type === "music");
    if (music.length === 0) return;
    // The keyboard cursor can only anchor to a row that is on screen, so it
    // takes the last music row of the visible page, or none.
    let anchor = -1;
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].type === "music") {
        anchor = i;
        break;
      }
    }
    setSelection({
      files: music.map((n) => toSelectedFile(n, currentPath)),
      lastIndex: anchor,
    });
  }, [fetchAllNodes, nodes, currentPath, searching, trimmedQuery]);

  const clearSelection = React.useCallback(
    () => setSelection({ files: [], lastIndex: -1 }),
    [],
  );

  const toFullPath = React.useCallback(
    (node: FileNode) => (currentPath ? joinPath(currentPath, node.name) : node.name),
    [currentPath],
  );

  const getFolderMusicPaths = React.useCallback(async () => {
    if (!currentPath) return [];
    const all = await fetchAllNodes();
    return all
      .filter((n) => n.type === "music")
      .map((n) => joinPath(currentPath, n.name));
  }, [fetchAllNodes, currentPath]);

  const value: ExplorerContextValue = {
    segments,
    currentPath,
    tree,
    loadedPath,
    nodes,
    loading,
    error,
    paginated: paginate,
    page: safePage,
    pageCount,
    pageStart,
    filteredCount,
    setPage,
    canGoBack,
    canGoForward,
    canGoUp,
    goInto,
    goToSegments,
    goBack,
    goForward,
    goUp,
    refresh,
    sortColumn,
    sortDirection,
    toggleSort,
    selection,
    selectedPaths,
    selectIndex,
    moveSelection,
    selectAllMusic,
    clearSelection,
    toFullPath,
    getFolderMusicPaths,
  };

  return (
    <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
  );
}
