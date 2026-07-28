import * as React from "react";
import { useExplorer } from "@/context/ExplorerContext";
import { useSearch } from "@/context/SearchContext";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** Wires the file-manager keyboard shortcuts described in new-frontend.md. */
export function GlobalKeyboard() {
  const {
    selection,
    nodes,
    selectAllMusic,
    moveSelection,
    clearSelection,
    goInto,
  } = useExplorer();
  const { focusSearch } = useSearch();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Use e.code (physical key) so shortcuts work on non-Latin layouts (e.g.
      // Russian), where e.key would be a Cyrillic character instead of "f"/"a".

      // Ctrl+F — focus the search bar (works even from within inputs)
      if (mod && e.code === "KeyF") {
        e.preventDefault();
        focusSearch();
        return;
      }

      if (isTypingTarget(e.target)) return;

      // Ctrl+A — select music files only
      if (mod && e.code === "KeyA") {
        e.preventDefault();
        selectAllMusic();
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(e.key === "ArrowDown" ? 1 : -1, e.shiftKey);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (selection.files.length === 1 && selection.files[0].type === "directory") {
          const node = nodes[selection.lastIndex];
          if (node && node.type === "directory") goInto(node);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selection,
    nodes,
    selectAllMusic,
    moveSelection,
    clearSelection,
    goInto,
    focusSearch,
  ]);

  return null;
}
