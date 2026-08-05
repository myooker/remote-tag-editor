/**
 * Run `op` over `items` with at most `limit` calls in flight, and report how
 * many rejected. Failures never abort the run — every item is attempted, which
 * is what the batch-write toasts ("saved 8/10, 2 failed") report on.
 *
 * With `limit === 1` this is exactly a sequential `for` loop, in order, which
 * is the default the write settings ship with.
 */
export async function forEachLimit<T>(
  items: readonly T[],
  limit: number,
  op: (item: T, index: number) => Promise<unknown>,
): Promise<number> {
  const workers = Math.max(1, Math.min(Math.trunc(limit) || 1, items.length));
  let next = 0;
  let failed = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        await op(items[i], i);
      } catch {
        failed += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, worker));
  return failed;
}
