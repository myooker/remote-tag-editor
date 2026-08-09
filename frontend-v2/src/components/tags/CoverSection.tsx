import { AlbumCover } from "./AlbumCover";
import { RawTagToggle } from "./RawTagToggle";

/**
 * Top of the tag panel: the cover art on a recessed panel, closed off by a
 * divider strip that carries the raw/normalized tumbler. The strip doubles as
 * the boundary between the artwork and the tag rows it labels, which is why the
 * toggle lives here instead of crowding the panel header.
 */
export function CoverSection({ path }: { path?: string }) {
  return (
    <div className="shrink-0 border-b border-border">
      {/* `--background` is only ~1% darker than the panel it sits on, so the
          recess comes from a black wash rather than a theme token. */}
      <div className="bg-black/20 px-4 py-4">
        <AlbumCover path={path} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/25 py-2 pl-4 pr-2.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          Tag names
        </span>
        <RawTagToggle />
      </div>
    </div>
  );
}
