import * as React from "react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { suggest } from "@/lib/tagRegistry";
import { cn } from "@/lib/utils";

/**
 * Text input that suggests tag names from GET /api/tag-registry as the user
 * types. Suggestions are the registry's display names; typing a raw spelling
 * ("TPE2") finds its field too, and the raw name is shown next to the match.
 *
 * Whatever ends up in the box is sent as typed — the field name is never
 * silently rewritten on the way to the backend.
 */
export function TagRegistryInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { tagIndex } = useApp();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const matches = React.useMemo(
    () => suggest(tagIndex, value),
    [value, tagIndex],
  );

  React.useEffect(() => setActive(0), [value]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[active].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {matches.map((m, i) => (
            <button
              key={m.name}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(m.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                i === active ? "bg-accent text-accent-foreground" : "text-foreground",
              )}
            >
              <span className="truncate">{m.name}</span>
              {m.raw && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {m.raw}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
