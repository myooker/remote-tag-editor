import * as React from "react";

/**
 * Returns `true` only once `active` has stayed true for `delay` ms — so a
 * loading throbber never flashes for near-instant loads. Resets immediately
 * when `active` goes false.
 */
export function useDelayedFlag(active: boolean, delay = 350): boolean {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [active, delay]);

  return shown;
}
