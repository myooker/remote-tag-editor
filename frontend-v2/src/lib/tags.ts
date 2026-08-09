import type { TagMap, TagValue } from "./types";
import { displayTag, stripRawPrefix, type TagIndex } from "./tagRegistry";

/** Program-defined tag the UI never renders as an editable row. */
const RTEID = "RTEID";

/**
 * True for the rteid field in any container spelling — `RTEID` on Vorbis,
 * `TXXX:RTEID` on ID3v2, `----:com.apple.iTunes:RTEID` on MP4.
 */
export function isRteid(key: string): boolean {
  return stripRawPrefix(key).toUpperCase() === RTEID;
}

/** Tags the UI never renders as editable rows. */
export function isHiddenTag(key: string): boolean {
  return isRteid(key);
}

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
  const key = Object.keys(tags).find(isRteid);
  if (!key) return null;
  const v = firstScalar(coerce(tags[key]));
  return v ? v : null;
}

export interface MergedField {
  /** Grouping key: the display name, or the raw name when unregistered. */
  key: string;
  /** Distinct raw spellings seen across the selection, first-seen order. */
  raws: string[];
  /** The raw key each file uses for this field; undefined when it has none. */
  perFileKey: (string | undefined)[];
  /** Each file's value, aligned to the input order. */
  perFile: (TagValue | undefined)[];
  /** "same" when every selected file agrees; otherwise the UI shows <keep>. */
  kind: "same" | "varied";
  /** The agreed value — only meaningful when `kind` is "same". */
  value: TagValue;
}

/**
 * Merge per-file tag maps for multi-selection, grouping by *field* rather than
 * by raw name: an mp3's `TPE1` and a flac's `ARTIST` are one row. Each file's
 * own raw key is carried along in `perFileKey`, because that is what its writes
 * have to use.
 */
export function mergeTags(maps: TagMap[], index: TagIndex): MergedField[] {
  const order: string[] = [];
  const groups = new Map<string, MergedField>();

  maps.forEach((map, fileIndex) => {
    for (const rawKey of Object.keys(map)) {
      const key = displayTag(index, rawKey);
      let field = groups.get(key);
      if (!field) {
        field = {
          key,
          raws: [],
          perFileKey: Array(maps.length).fill(undefined),
          perFile: Array(maps.length).fill(undefined),
          kind: "same",
          value: "",
        };
        groups.set(key, field);
        order.push(key);
      }
      if (!field.raws.includes(rawKey)) field.raws.push(rawKey);
      // A file holding two raw spellings of one field (TCON *and* TXXX:GENRE)
      // is addressed through the first one; the rest still show up in `raws`.
      if (field.perFileKey[fileIndex] !== undefined) continue;
      field.perFileKey[fileIndex] = rawKey;
      field.perFile[fileIndex] = coerce(map[rawKey]);
    }
  });

  for (const field of groups.values()) {
    const distinct = new Set(field.perFile.map((v) => JSON.stringify(v)));
    field.kind = distinct.size === 1 ? "same" : "varied";
    if (field.kind === "same") field.value = field.perFile[0] as TagValue;
  }

  return order.map((key) => groups.get(key) as MergedField);
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
