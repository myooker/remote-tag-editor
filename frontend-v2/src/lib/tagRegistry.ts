import type { TagMap } from "./types";

/**
 * Tag-name normalization, frontend side.
 *
 * The backend reads and writes **raw** container tag names — `TPE2` on an mp3,
 * `aART` on an m4a, `ALBUMARTIST` on a flac, `TXXX:Artists` for a user-defined
 * frame. `GET /api/tag-registry` hands out the translation table:
 *
 * ```json
 * { "Album Artist": ["ALBUM ARTIST", "WM/AlbumArtist", "TPE2", "aART", "ALBUMARTIST"] }
 * ```
 *
 * The key is the display ("normalized") name; every element is a raw spelling
 * that should be shown under that name. Normalization is strictly a *read*
 * direction concern: the raw key a file reported is what goes back to the
 * backend on every edit, add and remove. Nothing here ever rewrites a raw name
 * into a normalized one on the way out.
 *
 * Matching is **exact**. A raw name the table does not list verbatim is left
 * alone — `AUTHOR` is not the table's ASF `Author`, and guessing at near
 * matches renames fields the table never claimed.
 */

/** The `/api/tag-registry` payload: display name → raw spellings. */
export type TagAliasMap = Record<string, string[]>;

export interface TagIndex {
  /** Display names, sorted — the autocomplete vocabulary. */
  names: string[];
  /** Raw spelling → display name, matched exactly as the table spells it. */
  byRaw: Map<string, string>;
  /** Display name → its raw spellings, deduped, registry order. */
  aliases: Map<string, string[]>;
  /**
   * Raw spelling → the display names that lost the collision. Two entries in
   * the shipped table share a raw name; the label tooltip mentions the
   * alternatives rather than silently picking one.
   */
  ambiguous: Map<string, string[]>;
}

/**
 * Prefixes a raw name carries when the container has no dedicated field for it:
 * TagLib falls back to `TXXX:<KEY>` on ID3v2 and `----:com.apple.iTunes:<KEY>`
 * on MP4, so the same field can arrive either bare or prefixed.
 */
const RAW_PREFIXES = ["TXXX:", "WXXX:", "----:com.apple.iTunes:", "----:"];

/** Strip the user-defined-field prefix off a raw tag name, if it has one. */
export function stripRawPrefix(key: string): string {
  const lower = key.toLowerCase();
  for (const prefix of RAW_PREFIXES) {
    if (lower.startsWith(prefix.toLowerCase())) return key.slice(prefix.length);
  }
  return key;
}

export const EMPTY_TAG_INDEX: TagIndex = {
  names: [],
  byRaw: new Map(),
  aliases: new Map(),
  ambiguous: new Map(),
};

/**
 * Flatten one registry entry into raw spellings. Accepts the flat array the
 * endpoint returns today and the per-format object (`{ id3v2, vorbis, … }`)
 * the backend builds it from, so serving either shape works.
 */
function collectAliases(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const raw = value.trim();
    // Template placeholders ("FINGERPRINT=… {fingerprint}") are documentation,
    // not addressable tag names.
    if (raw && !raw.includes("{")) out.push(raw);
  } else if (Array.isArray(value)) {
    for (const v of value) collectAliases(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectAliases(v, out);
  }
  return out;
}

/**
 * Build the lookup index. Tolerant of what `/api/tag-registry` returns: the
 * name→aliases object, or the bare `string[]` of names older builds served
 * (which yields names with no aliases — display falls back to raw).
 */
export function buildTagIndex(payload: unknown): TagIndex {
  if (Array.isArray(payload)) {
    const names = payload.filter((n): n is string => typeof n === "string");
    return buildTagIndex(Object.fromEntries(names.map((n) => [n, []])));
  }
  if (!payload || typeof payload !== "object") return EMPTY_TAG_INDEX;

  const index: TagIndex = {
    names: [],
    byRaw: new Map(),
    aliases: new Map(),
    ambiguous: new Map(),
  };

  // Sorted so a raw name claimed by two entries always resolves the same way,
  // whatever order the backend serialized them in.
  const names = Object.keys(payload as Record<string, unknown>).sort((a, b) =>
    a.localeCompare(b),
  );

  const claim = (raw: string, name: string) => {
    const owner = index.byRaw.get(raw);
    if (owner === undefined) {
      index.byRaw.set(raw, name);
    } else if (owner !== name) {
      const others = index.ambiguous.get(raw) ?? [];
      if (!others.includes(name)) index.ambiguous.set(raw, [...others, name]);
    }
  };

  // The display name is a raw spelling of itself: history rows written before
  // the raw-tag migration stored normalized names, and users type them.
  for (const name of names) claim(name, name);

  for (const name of names) {
    const raws: string[] = [];
    for (const raw of collectAliases((payload as Record<string, unknown>)[name])) {
      if (!raws.includes(raw)) raws.push(raw);
      claim(raw, name);
    }
    index.names.push(name);
    index.aliases.set(name, raws);
  }

  return index;
}

/**
 * The display name for a raw tag, or the raw tag itself when the table does not
 * list that exact spelling.
 */
export function displayTag(index: TagIndex, raw: string): string {
  return index.byRaw.get(raw) ?? raw;
}

/** Whether the table lists this raw name. */
export function isKnownTag(index: TagIndex, raw: string): boolean {
  return index.byRaw.has(raw);
}

/** Raw spellings registered for a display name (empty for unknown names). */
export function rawAliases(index: TagIndex, name: string): string[] {
  return index.aliases.get(displayTag(index, name)) ?? [];
}

/** Display names that also claim this raw spelling, minus the winner. */
export function ambiguousWith(index: TagIndex, raw: string): string[] {
  return index.ambiguous.get(raw) ?? [];
}

/** True when two tag names — raw or normalized — denote the same field. */
export function sameField(index: TagIndex, a: string, b: string): boolean {
  return displayTag(index, a) === displayTag(index, b);
}

/**
 * The raw key **this file** uses for the field `key` denotes, or `undefined`
 * when the file has no such field.
 *
 * This is how a write aimed at several files stays correct across formats: the
 * key read off an mp3 (`TPE2`) must not be sent to a flac. Rather than guessing
 * a flac's spelling, ask the flac — its own tag map is the authority.
 */
export function rawKeyIn(
  index: TagIndex,
  tags: TagMap,
  key: string,
): string | undefined {
  if (key in tags) return key;
  for (const candidate of Object.keys(tags)) {
    if (sameField(index, candidate, key)) return candidate;
  }
  return undefined;
}

/** The label to render for a raw tag, honouring the raw/normalized toggle. */
export function tagLabel(
  index: TagIndex,
  raw: string,
  showRaw: boolean,
): string {
  return showRaw ? raw : displayTag(index, raw);
}

/**
 * Tooltip for a tag label: the spelling the label isn't showing, plus any
 * display names that lost a collision on this raw spelling.
 */
export function tagTooltip(
  index: TagIndex,
  raw: string,
  showRaw: boolean,
): string {
  const normalized = displayTag(index, raw);
  const parts = normalized === raw ? [raw] : [showRaw ? normalized : raw];
  const others = ambiguousWith(index, raw);
  if (others.length > 0) parts.push(`also: ${others.join(", ")}`);
  return parts.join(" · ");
}

/** Registry suggestions for a typed query: display names first, then raws. */
export function suggest(
  index: TagIndex,
  query: string,
  limit = 8,
): { name: string; raw?: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts: { name: string; raw?: string }[] = [];
  const contains: { name: string; raw?: string }[] = [];
  const viaRaw: { name: string; raw?: string }[] = [];
  const seen = new Set<string>();

  for (const name of index.names) {
    const lower = name.toLowerCase();
    if (lower === q) {
      seen.add(name);
      continue;
    }
    if (lower.startsWith(q)) {
      starts.push({ name });
      seen.add(name);
    } else if (lower.includes(q)) {
      contains.push({ name });
      seen.add(name);
    }
  }

  // A raw spelling the user typed ("TPE2") should find its field too. Typing is
  // matched loosely here — that's search, not normalization.
  for (const [raw, name] of index.byRaw) {
    if (viaRaw.length + starts.length + contains.length >= limit * 2) break;
    if (seen.has(name) || !raw.toLowerCase().startsWith(q)) continue;
    viaRaw.push({ name, raw });
    seen.add(name);
  }

  return [...starts, ...contains, ...viaRaw].slice(0, limit);
}
