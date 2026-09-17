import { AlbumCover } from "./AlbumCover";
import { RawTagToggle } from "./RawTagToggle";

/**
 * Top of the tag panel: the cover art on a recessed panel, closed off by a
 * divider strip that carries the raw/normalized tumbler. The strip doubles as
 * the boundary between the artwork and the tag rows it labels, which is why the
 * toggle lives here instead of crowding the panel header.
 *
 * Both halves are returned as siblings rather than nested in a wrapper: the
 * strip sticks to the top of the scroll area (right under the panel header,
 * which sits outside it), and a sticky element can only travel as far as its
 * containing block — a wrapper ending just below the strip would pin it in
 * place.
 */
export function CoverSection({ path }: { path?: string }) {
  return (
    <>
      {/* `--background` is only ~1% darker than the panel it sits on, so the
          recess comes from a black wash rather than a theme token. */}
      <div className="shrink-0 bg-black/20 px-4 py-4">
        <AlbumCover path={path} />
      </div>
      {/* The strip must be opaque or the tag rows show through it once stuck,
          so it repaints the layers the panel itself stacks (background, then
          the aside's card/30) underneath its own muted wash. */}
      <div className="sticky top-0 z-10 shrink-0 bg-background">
        <div className="border-y border-border bg-card/30">
          <div className="flex items-center justify-between gap-2 bg-muted/25 py-2 pl-4 pr-2.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              Tag names
            </span>
            <RawTagToggle />
          </div>
        </div>
      </div>
    </>
  );
}
