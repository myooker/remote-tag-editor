import { Home, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExplorer } from "@/context/ExplorerContext";

export function Breadcrumb() {
  const { segments, goToSegments } = useExplorer();

  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm">
      <button
        onClick={() => goToSegments([])}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          segments.length === 0 && "text-foreground",
        )}
      >
        <Home className="size-3.5" />
        <span className="font-medium">Home</span>
      </button>

      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        return (
          <div key={idx} className="flex shrink-0 items-center gap-0.5">
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            <button
              onClick={() => goToSegments(segments.slice(0, idx + 1))}
              className={cn(
                "max-w-[16rem] truncate rounded px-1.5 py-1 transition-colors hover:bg-accent hover:text-foreground",
                isLast ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              title={seg}
            >
              {seg}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
