import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
}

/** basename of a slash-separated path */
export function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Natural comparator: "Track 2" < "Track 10" */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Parse the backend's "YYYY-MM-DD HH:MM:SS" (UTC) into a Date. */
export function parseChangedAt(value: string): Date {
  return new Date(value.replace(" ", "T") + "Z");
}
