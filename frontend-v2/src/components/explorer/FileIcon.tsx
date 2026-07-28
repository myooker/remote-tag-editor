import { FolderClosed, Disc3, Image, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/lib/types";

const ICON = {
  directory: FolderClosed,
  music: Disc3,
  picture: Image,
  file: FileText,
} as const;

const COLOR: Record<NodeType, string> = {
  directory: "text-amber-400",
  music: "text-primary",
  picture: "text-emerald-400",
  file: "text-muted-foreground",
};

export function FileIcon({ type, className }: { type: NodeType; className?: string }) {
  const Icon = ICON[type] ?? FileText;
  return <Icon className={cn("size-4 shrink-0", COLOR[type], className)} />;
}
