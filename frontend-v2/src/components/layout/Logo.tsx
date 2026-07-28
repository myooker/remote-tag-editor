import * as React from "react";
import { cn } from "@/lib/utils";

const TRIGGER_CLICKS = 7;
const MAX_SCALE = 1.45;
const GROW_STEP = (MAX_SCALE - 1) / (TRIGGER_CLICKS - 1);

/** The app logo with the click-to-grow easter egg from the original frontend. */
export function Logo({ className }: { className?: string }) {
  const ref = React.useRef<HTMLImageElement>(null);
  const clicks = React.useRef(0);
  const locked = React.useRef(false);
  const [deflating, setDeflating] = React.useState(false);

  const onClick = () => {
    const el = ref.current;
    if (!el || locked.current) return;
    clicks.current += 1;
    const scale = 1 + GROW_STEP * (clicks.current - 1);
    el.style.transform = `scale(${scale.toFixed(3)})`;

    if (clicks.current >= TRIGGER_CLICKS) {
      locked.current = true;
      el.style.transform = "";
      setDeflating(true);
    }
  };

  return (
    <img
      ref={ref}
      src="/logo.svg"
      alt="Logo"
      draggable={false}
      onClick={onClick}
      onAnimationEnd={() => {
        setDeflating(false);
        clicks.current = 0;
        locked.current = false;
        if (ref.current) ref.current.style.transform = "";
      }}
      className={cn(
        "h-9 w-9 cursor-pointer select-none transition-transform duration-150 will-change-transform",
        deflating && "animate-logo-deflate",
        className,
      )}
    />
  );
}
