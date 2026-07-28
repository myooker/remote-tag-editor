import * as React from "react";
import { FileMusic, MousePointerClick, FileX2 } from "lucide-react";
import { SingleFileTags } from "./SingleFileTags";
import { MultiFileTags } from "./MultiFileTags";
import { HistoryToggle } from "./HistoryToggle";
import { useExplorer } from "@/context/ExplorerContext";
import { useHistoryPanel } from "@/context/HistoryContext";
import { basename } from "@/lib/utils";

function EmptyPanel({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <div className="opacity-50">{icon}</div>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {subtitle && <p className="max-w-[16rem] text-xs">{subtitle}</p>}
    </div>
  );
}

export function TagPanel() {
  const { selection } = useExplorer();
  const { setTarget } = useHistoryPanel();
  const [rteidBadge, setRteidBadge] = React.useState<React.ReactNode>(null);

  const musicFiles = React.useMemo(
    () => selection.files.filter((f) => f.type === "music"),
    [selection.files],
  );
  const selectionKey = musicFiles.map((f) => f.path).join("\n");

  // Reset the header RTEID badge whenever the (music) selection changes;
  // SingleFileTags re-publishes it when appropriate.
  React.useEffect(() => {
    setRteidBadge(null);
  }, [selectionKey]);

  // The history panel only applies to a single music file. For any other
  // selection, drop the target so the panel hides (SingleFileTags owns setting
  // it when exactly one music file is selected).
  React.useEffect(() => {
    if (musicFiles.length !== 1) setTarget(null);
  }, [musicFiles.length, setTarget]);

  const onRteid = React.useCallback((badge: React.ReactNode) => {
    setRteidBadge(badge);
  }, []);

  const status =
    selection.files.length === 0
      ? "No file selected"
      : musicFiles.length === 1
        ? basename(musicFiles[0].path)
        : musicFiles.length > 1
          ? `${musicFiles.length} music files`
          : `${selection.files.length} selected · no music`;

  let body: React.ReactNode;
  if (musicFiles.length === 1) {
    body = <SingleFileTags key={musicFiles[0].path} filePath={musicFiles[0].path} onRteid={onRteid} />;
  } else if (musicFiles.length > 1) {
    body = <MultiFileTags key={selectionKey} filePaths={musicFiles.map((f) => f.path)} />;
  } else if (selection.files.length > 0) {
    body = (
      <EmptyPanel
        icon={<FileX2 className="size-10" />}
        title="No music selected"
        subtitle="The current selection contains no audio files to tag."
      />
    );
  } else {
    body = (
      <EmptyPanel
        icon={<MousePointerClick className="size-10" />}
        title="Select a music file"
        subtitle="Choose a track to view and edit its tags. Ctrl+A selects every track in the folder."
      />
    );
  }

  return (
    <aside className="flex w-[384px] shrink-0 flex-col border-l border-border bg-card/30">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileMusic className="size-4 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">Tags</span>
            <span className="truncate text-xs text-muted-foreground" title={status}>
              {status}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rteidBadge}
          <HistoryToggle />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </aside>
  );
}
