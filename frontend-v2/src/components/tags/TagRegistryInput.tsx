import * as React from "react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

/**
 * Text input that suggests tag names from GET /api/tag-registry as the user
 * types (the tag normalization table).
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
  const { tagRegistry } = useApp();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const matches = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const t of tagRegistry) {
      const lower = t.toLowerCase();
      if (lower === q) continue;
      if (lower.startsWith(q)) starts.push(t);
      else if (lower.includes(q)) contains.push(t);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [value, tagRegistry]);

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
            choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {matches.map((m, i) => (
            <button
              key={m}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(m);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                i === active ? "bg-accent text-accent-foreground" : "text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
