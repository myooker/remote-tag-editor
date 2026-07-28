import * as React from "react";
import { api } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface AppContextValue {
  ready: boolean;
  mountPoint: string | null;
  settings: AppSettings | null;
  /** true when the backend was started with --use-rteid (history keyed by rteid). */
  useRteid: boolean;
  tagRegistry: string[];
  status: ConnectionStatus;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 60_000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mountPoint, setMountPoint] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [tagRegistry, setTagRegistry] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");

  // Bootstrap: poll for the mount point until the backend is reachable, then
  // load settings + tag registry.
  React.useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function boot() {
      try {
        const { path } = await api.getMountPoint();
        if (cancelled) return;
        setMountPoint(path);
        setStatus("connected");

        // Best-effort: these shouldn't block the app if they fail.
        api.getSettings().then(
          (s) => !cancelled && setSettings(s),
          () => undefined,
        );
        api.getTagRegistry().then(
          (r) => !cancelled && setTagRegistry(Array.isArray(r) ? r : []),
          () => undefined,
        );
      } catch {
        if (cancelled) return;
        setStatus("connecting");
        timer = window.setTimeout(boot, POLL_INTERVAL_MS);
      }
    }

    boot();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Heartbeat once connected.
  React.useEffect(() => {
    if (!mountPoint) return;
    const id = window.setInterval(async () => {
      try {
        const ok = await api.heartbeat();
        setStatus(ok ? "connected" : "error");
      } catch {
        setStatus("disconnected");
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [mountPoint]);

  const value: AppContextValue = {
    ready: mountPoint !== null,
    mountPoint,
    settings,
    useRteid: settings?.rteid ?? false,
    tagRegistry,
    status,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
