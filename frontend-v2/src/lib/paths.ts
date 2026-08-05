/** Join a base directory with a child name, normalizing slashes. */
export function joinPath(base: string, name: string): string {
  return `${base.replace(/\/+$/, "")}/${name}`;
}

/** The parent directory of an absolute path (never above `root`). */
export function parentPath(path: string, root: string): string {
  if (path === root) return root;
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  const parent = "/" + parts.join("/");
  return parent.length < root.length ? root : parent;
}

/** Decode a router pathname ("/a/b%20c") into relative segments (["a", "b c"]). */
export function pathnameToSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    });
}

/** Build a router path ("/a/b%20c") from relative segments. */
export function segmentsToPathname(segments: string[]): string {
  if (segments.length === 0) return "/";
  return "/" + segments.map(encodeURIComponent).join("/");
}

/** Absolute mount-point path for the given relative segments. */
export function absolutePath(mountPoint: string, segments: string[]): string {
  if (segments.length === 0) return mountPoint;
  return joinPath(mountPoint, segments.join("/"));
}

/**
 * Relative segments of an absolute path below the mount point. Tolerates a
 * trailing slash on either side — the backend reports the mount point as
 * "/music/" but resolved paths without the slash, and a mismatch here would
 * push the whole mount point into the segment list.
 */
export function relativeSegments(mountPoint: string, path: string): string[] {
  const root = mountPoint.replace(/\/+$/, "");
  const target = path.replace(/\/+$/, "");
  if (target === root) return [];
  // The separator matters: "/music2-old" must not count as being below "/music2".
  const rel = target.startsWith(`${root}/`) ? target.slice(root.length) : target;
  return rel.split("/").filter(Boolean);
}
