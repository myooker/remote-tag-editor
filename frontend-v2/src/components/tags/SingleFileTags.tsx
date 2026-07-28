import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { AlbumCover } from "./AlbumCover";
import { TagField } from "./TagField";
import { AddFieldSection } from "./AddFieldSection";
import { TagPanelContextMenu } from "./TagPanelContextMenu";
import { useTags } from "@/hooks/useTags";
import { useTagMutations } from "@/hooks/useTagMutations";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useApp } from "@/context/AppContext";
import { useHistoryPanel } from "@/context/HistoryContext";
import { useDialogs } from "@/hooks/useDialogs";
import { coerce, readRteid, HIDDEN_TAGS } from "@/lib/tags";
import { basename } from "@/lib/utils";
import { RteidBadge } from "./RteidBadge";

export function SingleFileTags({
  filePath,
  onRteid,
}: {
  filePath: string;
  onRteid: (badge: React.ReactNode) => void;
}) {
  const { tags, loading, error, reload } = useTags(filePath);
  const mut = useTagMutations(reload);
  const { useRteid } = useApp();
  const { setTarget, tagsRefreshToken } = useHistoryPanel();
  const { confirm } = useDialogs();

  // Reload after an undo elsewhere (history panel).
  const skipFirstRefresh = React.useRef(true);
  React.useEffect(() => {
    if (skipFirstRefresh.current) {
      skipFirstRefresh.current = false;
      return;
    }
    reload();
  }, [tagsRefreshToken, reload]);

  const rteid = tags ? readRteid(tags) : null;
  const showThrobber = useDelayedFlag(!tags && !error);

  // Publish the RTEID badge to the panel header.
  React.useEffect(() => {
    onRteid(rteid ? <RteidBadge rteid={rteid} /> : null);
  }, [rteid, onRteid]);

  // Configure the history target (rteid when useRteid, else the path). Do NOT
  // clear on unmount: switching between music files should swap the history
  // panel's content, not close it. TagPanel clears the target when the
  // selection is no longer a single music file.
  React.useEffect(() => {
    if (!useRteid) {
      // Identifier is the path — known immediately, no need to wait for tags.
      setTarget({ identifier: filePath, title: basename(filePath) });
      return;
    }
    // useRteid: identifier is the file's RTEID, known only once tags load.
    // Keep the current target while loading so the panel doesn't flash closed.
    if (loading && !tags) return;
    setTarget(rteid ? { identifier: rteid, title: basename(filePath) } : null);
  }, [useRteid, filePath, rteid, loading, tags, setTarget]);

  const entries = React.useMemo(
    () =>
      tags
        ? Object.entries(tags).filter(([key]) => !HIDDEN_TAGS.has(key))
        : [],
    [tags],
  );

  const removeFromMenu = async ({ key, value }: { key: string; value: string }) => {
    const ok = await confirm({
      title: `Remove “${key}”?`,
      description: "This deletes the tag field from this file.",
      destructive: true,
      confirmLabel: "Remove",
    });
    if (ok) await mut.removeFile(filePath, key, value);
  };

  if (!tags && !error) {
    // Only reveal the throbber if the load is actually slow — avoids a flash.
    return showThrobber ? (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <span className="text-sm">Loading tags…</span>
      </div>
    ) : null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm">Failed to load tags</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <TagPanelContextMenu onRemoveField={removeFromMenu}>
      <div className="flex flex-col gap-4 p-4">
        <AlbumCover path={filePath} />

        <div className="flex flex-col gap-4">
          {entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No tags found</p>
          ) : (
            entries.map(([key, value]) => (
              <TagField
                key={key}
                filePath={filePath}
                tagKey={key}
                value={coerce(value)}
                mut={mut}
                reload={reload}
              />
            ))
          )}
        </div>

        <AddFieldSection
          variant="single"
          onAdd={(scope, fieldType, value) =>
            scope === "folder"
              ? mut.addFolder(fieldType, value)
              : mut.addFile(filePath, fieldType, value)
          }
        />
      </div>
    </TagPanelContextMenu>
  );
}
