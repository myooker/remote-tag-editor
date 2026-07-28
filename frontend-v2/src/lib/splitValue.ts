/** Preset delimiters offered in the split dialog. */
export interface DelimPreset {
  id: string;
  label: string;
  regex: RegExp;
}

export const DELIM_PRESETS: DelimPreset[] = [
  { id: ";", label: ";", regex: /\s*;\s*/ },
  { id: "/", label: "/", regex: /\s*\/\s*/ },
  { id: ",", label: ",", regex: /\s*,\s*/ },
  { id: "collab", label: "feat. / ft. / &", regex: /\s*(?:feat\.?|ft\.?|&)\s*/i },
];

export function splitByRegex(value: string, regex: RegExp): string[] {
  return value
    .split(regex)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True if any preset delimiter appears in the value (drives the scissors button). */
export function hasAnyDelimiter(value: string): boolean {
  return DELIM_PRESETS.some((d) => d.regex.test(value));
}

/** The id of the first preset that matches, for a sensible default in the dialog. */
export function detectPreset(value: string): string {
  return DELIM_PRESETS.find((d) => d.regex.test(value))?.id ?? ";";
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A split regex for a user-typed delimiter (surrounding whitespace trimmed). */
export function customRegex(delim: string): RegExp {
  return new RegExp("\\s*" + escapeRegex(delim) + "\\s*");
}

const PLURALS: Record<string, string> = {
  ARTIST: "ARTISTS",
  ALBUMARTIST: "ALBUMARTISTS",
  COMPOSER: "COMPOSERS",
  CONDUCTOR: "CONDUCTORS",
  PRODUCER: "PRODUCERS",
  REMIXER: "REMIXERS",
  GENRE: "GENRES",
  LYRICIST: "LYRICISTS",
  WRITER: "WRITERS",
};

/** Suggested destination field for a split (ARTIST → ARTISTS, else name + "S"). */
export function pluralField(name: string): string {
  const up = name.toUpperCase();
  if (PLURALS[up]) return PLURALS[up];
  if (up.endsWith("S")) return up;
  return up + "S";
}
