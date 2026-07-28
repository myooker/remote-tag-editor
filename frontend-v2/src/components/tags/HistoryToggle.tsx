import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useHistoryPanel } from "@/context/HistoryContext";
import { cn } from "@/lib/utils";

export function HistoryToggle() {
  const { available, open, toggle } = useHistoryPanel();
  return (
    <SimpleTooltip
      label={available ? "Toggle change history" : "No history available for this file"}
    >
      <Button
        variant={open ? "secondary" : "ghost"}
        size="sm"
        disabled={!available}
        onClick={toggle}
        className={cn(open && "ring-1 ring-border")}
      >
        <History />
        History
      </Button>
    </SimpleTooltip>
  );
}
