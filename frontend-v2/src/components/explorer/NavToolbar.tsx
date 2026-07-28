import { ArrowLeft, ArrowRight, ArrowUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Breadcrumb } from "./Breadcrumb";
import { useExplorer } from "@/context/ExplorerContext";
import { cn } from "@/lib/utils";

export function NavToolbar() {
  const {
    canGoBack,
    canGoForward,
    canGoUp,
    goBack,
    goForward,
    goUp,
    refresh,
    loading,
  } = useExplorer();

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/40 px-2 py-1.5">
      <SimpleTooltip label="Back (Alt+←, mouse back)">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canGoBack}
          onClick={goBack}
          aria-label="Back"
        >
          <ArrowLeft />
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Forward (Alt+→, mouse forward)">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canGoForward}
          onClick={goForward}
          aria-label="Forward"
        >
          <ArrowRight />
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Up one level">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canGoUp}
          onClick={goUp}
          aria-label="Up"
        >
          <ArrowUp />
        </Button>
      </SimpleTooltip>

      <SimpleTooltip label="Refresh">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={refresh}
          aria-label="Refresh"
        >
          <RefreshCw className={cn(loading && "animate-spin")} />
        </Button>
      </SimpleTooltip>

      <div className="mx-1 h-5 w-px shrink-0 bg-border" />

      <Breadcrumb />
    </div>
  );
}
