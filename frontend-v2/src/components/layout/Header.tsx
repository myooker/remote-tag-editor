import * as React from "react";
import { Search, Settings, X } from "lucide-react";
import { Logo } from "./Logo";
import { StatusIndicator } from "./StatusIndicator";
import { SettingsDialog } from "./SettingsDialog";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useApp } from "@/context/AppContext";
import { useSearch } from "@/context/SearchContext";

export function Header() {
  const { mountPoint, status } = useApp();
  const { query, setQuery, inputRef } = useSearch();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        <div className="flex min-w-0 flex-col leading-tight">
          <h1 className="truncate text-sm font-semibold">Music Tag Editor</h1>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {mountPoint ?? (status === "connecting" ? "Connecting…" : "—")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden w-64 md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…  (Ctrl+F)"
            className="h-9 w-full rounded-md border border-input bg-background/60 pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <StatusIndicator />

        <SimpleTooltip label="Settings">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings />
          </Button>
        </SimpleTooltip>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
