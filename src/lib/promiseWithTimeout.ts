export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "timeout",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), timeoutMs);
    }),
  ]);
}
