import * as React from "react";

/**
 * Client-side preferences, persisted in localStorage. These are per-browser and
 * never sent to the backend — unlike `AppContext`, which exposes the settings
 * the server was started with.
 */
export interface Prefs {
  /** When false, batch tag writes go out strictly one at a time (the default). */
  parallelWrites: boolean;
  /** Requests in flight when `parallelWrites` is on. */
  writeConcurrency: number;
  /**
   * Label tag rows with the file's raw tag name (`TPE2`) instead of the
   * registry's display name ("Album Artist"). Display only — writes always use
   * the raw name either way.
   */
  showRawTags: boolean;
}

export const MIN_CONCURRENCY = 2;
export const MAX_CONCURRENCY = 16;
export const DEFAULT_CONCURRENCY = 5;

const DEFAULTS: Prefs = {
  parallelWrites: false,
  writeConcurrency: DEFAULT_CONCURRENCY,
  showRawTags: false,
};

const STORAGE_KEY = "rte.prefs";

export function clampConcurrency(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CONCURRENCY;
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, Math.trunc(n)));
}

function load(): Prefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      parallelWrites: parsed.parallelWrites === true,
      writeConcurrency: clampConcurrency(
        parsed.writeConcurrency ?? DEFAULT_CONCURRENCY,
      ),
      showRawTags: parsed.showRawTags === true,
    };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsContextValue extends Prefs {
  /** Requests to run in parallel: 1 unless parallel writes are enabled. */
  writeLimit: number;
  setParallelWrites: (on: boolean) => void;
  setWriteConcurrency: (n: number) => void;
  setShowRawTags: (on: boolean) => void;
}

const PrefsContext = React.createContext<PrefsContextValue | null>(null);

export function usePrefs(): PrefsContextValue {
  const ctx = React.useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within <PrefsProvider>");
  return ctx;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = React.useState<Prefs>(load);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode / quota: preferences just don't persist */
    }
  }, [prefs]);

  const value = React.useMemo<PrefsContextValue>(
    () => ({
      ...prefs,
      writeLimit: prefs.parallelWrites ? prefs.writeConcurrency : 1,
      setParallelWrites: (on) =>
        setPrefs((p) => ({ ...p, parallelWrites: on })),
      setWriteConcurrency: (n) =>
        setPrefs((p) => ({ ...p, writeConcurrency: clampConcurrency(n) })),
      setShowRawTags: (on) => setPrefs((p) => ({ ...p, showRawTags: on })),
    }),
    [prefs],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
