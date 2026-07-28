import * as React from "react";

export interface HistoryTarget {
  /** rteid when useRteid is on, otherwise the file's absolute path. */
  identifier: string;
  /** Display name (the file's basename). */
  title: string;
}

interface HistoryContextValue {
  open: boolean;
  target: HistoryTarget | null;
  /** History can be shown for the current selection. */
  available: boolean;
  setTarget: (target: HistoryTarget | null) => void;
  toggle: () => void;
  close: () => void;
  /** Bumped after an undo so the tag editor reloads the affected file(s). */
  tagsRefreshToken: number;
  refreshTags: () => void;
}

const HistoryContext = React.createContext<HistoryContextValue | null>(null);

export function useHistoryPanel(): HistoryContextValue {
  const ctx = React.useContext(HistoryContext);
  if (!ctx) throw new Error("useHistoryPanel must be used within <HistoryProvider>");
  return ctx;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [target, setTargetState] = React.useState<HistoryTarget | null>(null);
  const [tagsRefreshToken, setTagsRefreshToken] = React.useState(0);

  // Note: changing the target does NOT open or close the panel. The panel is
  // only rendered when `open && target`, so it stays open across file switches
  // (swapping content) and simply hides when nothing taggable is selected.
  const setTarget = React.useCallback((next: HistoryTarget | null) => {
    setTargetState((prev) => {
      if (prev === next) return prev;
      if (prev && next && prev.identifier === next.identifier && prev.title === next.title) {
        return prev;
      }
      return next;
    });
  }, []);

  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  const close = React.useCallback(() => setOpen(false), []);
  const refreshTags = React.useCallback(
    () => setTagsRefreshToken((t) => t + 1),
    [],
  );

  const value: HistoryContextValue = {
    open,
    target,
    available: target !== null,
    setTarget,
    toggle,
    close,
    tagsRefreshToken,
    refreshTags,
  };

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}
