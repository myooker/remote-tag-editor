import type { TagMap, TagValue } from "./types";

/** Tags that the UI never renders as editable rows. */
export const HIDDEN_TAGS = new Set(["RTEID"]);

/** Coerce any JSON tag value into a string or string[]. */
export function coerce(value: unknown): TagValue {
  if (Array.isArray(value)) return value.map((v) => String(v ?? ""));
  return String(value ?? "");
}

/** First scalar of a tag value (arrays collapse to their first element). */
export function firstScalar(value: TagValue | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

export function readRteid(tags: TagMap): string | null {
  const raw = tags["RTEID"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v ? String(v) : null;
}

export type MergedField =
  | { kind: "same"; value: TagValue }
  | { kind: "varied"; perFile: (TagValue | undefined)[] };

/**
 * Merge per-file tag maps for multi-selection. A field is "same" when every
 * selected file agrees; otherwise it's "varied" and the UI shows <keep>.
 * `perFile` stays aligned to the input order so edits map back to each path.
 */
export function mergeTags(maps: TagMap[]): Record<string, MergedField> {
  const keys = new Set<string>();
  maps.forEach((m) => Object.keys(m).forEach((k) => keys.add(k)));

  const merged: Record<string, MergedField> = {};
  for (const key of keys) {
    const values = maps.map((m) =>
      key in m ? coerce(m[key]) : undefined,
    );
    const distinct = new Set(values.map((v) => JSON.stringify(v)));
    if (distinct.size === 1) {
      merged[key] = { kind: "same", value: values[0] as TagValue };
    } else {
      merged[key] = { kind: "varied", perFile: values };
    }
  }
  return merged;
}

/** All distinct scalar values across files, for the <keep> dropdown. */
export function distinctValues(perFile: (TagValue | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of perFile) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => x && set.add(x));
    else if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
