import * as React from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useExplorer } from "@/context/ExplorerContext";
import { cn } from "@/lib/utils";

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-30",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Page controls for the file list. Rendered only when paging is enabled and
 * the current folder actually spills past one page — a two-page-max folder
 * shouldn't grow a toolbar it never needs.
 */
export function Pagination() {
  const { paginated, page, pageCount, pageStart, nodes, filteredCount, setPage } =
    useExplorer();

  // Jump box, editable as free text so a partial number can be typed.
  const [draft, setDraft] = React.useState(String(page + 1));
  React.useEffect(() => setDraft(String(page + 1)), [page]);

  if (!paginated || pageCount <= 1) return null;

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(page + 1));
      return;
    }
    setPage(Math.min(pageCount, Math.max(1, parsed)) - 1);
  };

  const first = filteredCount === 0 ? 0 : pageStart + 1;
  const last = pageStart + nodes.length;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card/40 px-3 py-1.5 text-xs">
      <span className="truncate text-muted-foreground">
        {first}–{last} of {filteredCount}
      </span>

      <div className="flex items-center gap-1">
        <PageButton label="First page" disabled={page === 0} onClick={() => setPage(0)}>
          <ChevronFirst className="size-4" />
        </PageButton>
        <PageButton
          label="Previous page"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </PageButton>

        <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
          <input
            aria-label="Page number"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={cn(
              "h-6 w-10 rounded border border-border bg-background text-center font-mono",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          />
          <span>of {pageCount}</span>
        </div>

        <PageButton
          label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="size-4" />
        </PageButton>
        <PageButton
          label="Last page"
          disabled={page >= pageCount - 1}
          onClick={() => setPage(pageCount - 1)}
        >
          <ChevronLast className="size-4" />
        </PageButton>
      </div>
    </div>
  );
}
