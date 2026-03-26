/**
 * Serialize browser-side Supabase auth calls that use navigator.locks.
 * Multiple mounted hooks (nav + page + panels) otherwise call getUser() concurrently
 * and trigger: "Lock ... was released because another request stole it".
 */
let chain: Promise<unknown> = Promise.resolve();

export function runSerializedAuth<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn);
  chain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
