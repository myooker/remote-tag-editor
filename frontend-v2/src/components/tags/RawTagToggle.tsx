import type * as React from "react";
import { Tag, Code } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { usePrefs } from "@/context/PrefsContext";
import { cn } from "@/lib/utils";

/**
 * Two-position tumbler for tag labels: registry display names ("Album Artist")
 * or the file's own raw names (`TPE2`). Purely cosmetic — every write still
 * carries the raw name the file reported.
 */
export function RawTagToggle() {
  const { showRawTags, setShowRawTags } = usePrefs();

  const side = (
    active: boolean,
    label: string,
    hint: string,
    icon: React.ReactNode,
    onClick: () => void,
  ) => (
    <SimpleTooltip label={hint}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        onClick={onClick}
        className={cn(
          // rounded-sm is exactly rounded-md minus the p-0.5 the container adds,
          // so the halves nest inside its corners instead of cutting them.
          "flex h-full w-7 items-center justify-center rounded-sm transition-colors [&_svg]:size-3.5",
          active
            ? "bg-secondary text-secondary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
      </button>
    </SimpleTooltip>
  );

  return (
    <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-border bg-background/60 p-0.5">
      {side(
        !showRawTags,
        "Show normalized tag names",
        "Normalized names",
        <Tag />,
        () => setShowRawTags(false),
      )}
      {side(
        showRawTags,
        "Show raw tag names",
        "Raw tag names",
        <Code />,
        () => setShowRawTags(true),
      )}
    </div>
  );
}
