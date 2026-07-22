/** Compact label for GC-style whole amounts (e.g. 400K). */
export function formatCompactGcAmount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) {
    const x = n / 1_000_000;
    const s = (Math.round(x * 10) / 10).toString();
    return `${s.replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const x = n / 1000;
    const s = (Math.round(x * 10) / 10).toString();
    return `${s.replace(/\.0$/, "")}K`;
  }
  return String(Math.round(n));
}
