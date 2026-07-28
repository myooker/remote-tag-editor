import * as React from "react";
import { api } from "@/lib/api";
import type { TagMap } from "@/lib/types";

export function useTags(path: string | null) {
  const [tags, setTags] = React.useState<TagMap | null>(null);
  // Start "loading" when a path is given so the first render never flashes the
  // empty editor before the fetch effect runs.
  const [loading, setLoading] = React.useState(path !== null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const token = React.useRef(0);

  React.useEffect(() => {
    if (!path) {
      setTags(null);
      return;
    }
    const current = ++token.current;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    api
      .getTags(path, controller.signal)
      .then((data) => {
        if (current !== token.current) return;
        setTags(data);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || current !== token.current) return;
        setError(err.message ?? "Failed to load tags");
        setTags(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [path, reloadToken]);

  const reload = React.useCallback(() => setReloadToken((t) => t + 1), []);
  return { tags, loading, error, reload };
}

export function useMultiTags(paths: string[]) {
  const [maps, setMaps] = React.useState<TagMap[] | null>(null);
  const [loading, setLoading] = React.useState(paths.length > 0);
  const [reloadToken, setReloadToken] = React.useState(0);
  const token = React.useRef(0);
  const key = paths.join("\n");

  React.useEffect(() => {
    if (paths.length === 0) {
      setMaps(null);
      return;
    }
    const current = ++token.current;
    setLoading(true);
    Promise.all(
      paths.map((p) => api.getTags(p).catch(() => ({}) as TagMap)),
    ).then((all) => {
      if (current !== token.current) return;
      setMaps(all);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  const reload = React.useCallback(() => setReloadToken((t) => t + 1), []);
  return { maps, loading, reload };
}
