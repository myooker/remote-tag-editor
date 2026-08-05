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
import { sortNodes, type SortColumn, type SortDirection } from "@/lib/sort";
import { basename } from "@/lib/utils";
import { useApp } from "./AppContext";
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
  /** The sorted + search-filtered nodes actually shown; selection indices are relative to this. */
  nodes: FileNode[];
  loading: boolean;
  error: string | null;
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
  selectAllMusic: () => void;
  clearSelection: () => void;
  toFullPath: (node: FileNode) => string;
  /** Absolute paths of every music file in the current directory (unfiltered). */
  folderMusicPaths: string[];
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

  React.useEffect(() => {
    if (!currentPath) return;
    const token = ++loadToken.current;
    setLoading(true);
    setError(null);
    setSelection({ files: [], lastIndex: -1 });

    const controller = new AbortController();
    api
      .listDir(currentPath, controller.signal)
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
  }, [currentPath, refreshToken]);

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

  const sortedNodes = React.useMemo(
    () => (tree?.content ? sortNodes(tree.content, sortColumn, sortDirection) : []),
    [tree, sortColumn, sortDirection],
  );

  // Search filters the visible list; selection + keyboard nav operate on it.
  const nodes = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedNodes;
    return sortedNodes.filter((n) => basename(n.name).toLowerCase().includes(q));
  }, [sortedNodes, query]);

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
      setSelection((prev) => {
        let index = prev.lastIndex;
        if (index === -1) {
          index = delta > 0 ? 0 : nodes.length - 1;
        } else {
          index = Math.max(0, Math.min(nodes.length - 1, index + delta));
        }
        const node = nodes[index];
        if (!node) return prev;
        const asFile = toSelectedFile(node, currentPath);
        if (!shift) return { files: [asFile], lastIndex: index };
        const exists = prev.files.some((f) => f.path === asFile.path);
        return {
          files: exists ? prev.files : [...prev.files, asFile],
          lastIndex: index,
        };
      });
    },
    [nodes, currentPath],
  );

  const selectAllMusic = React.useCallback(() => {
    if (!currentPath) return;
    const music = nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.type === "music");
    if (music.length === 0) return;
    setSelection({
      files: music.map(({ n }) => toSelectedFile(n, currentPath)),
      lastIndex: music[music.length - 1].i,
    });
  }, [nodes, currentPath]);

  const clearSelection = React.useCallback(
    () => setSelection({ files: [], lastIndex: -1 }),
    [],
  );

  const toFullPath = React.useCallback(
    (node: FileNode) => (currentPath ? joinPath(currentPath, node.name) : node.name),
    [currentPath],
  );

  const folderMusicPaths = React.useMemo(() => {
    if (!currentPath || !tree?.content) return [];
    return tree.content
      .filter((n) => n.type === "music")
      .map((n) => joinPath(currentPath, n.name));
  }, [tree, currentPath]);

  const value: ExplorerContextValue = {
    segments,
    currentPath,
    tree,
    loadedPath,
    nodes,
    loading,
    error,
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
    folderMusicPaths,
  };

  return (
    <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
  );
}
