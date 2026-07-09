export class ClientVersionError extends Error {
  readonly updateUrl: string;
  constructor(updateUrl: string) {
    super("A new version of the app is required");
    this.name = "ClientVersionError";
    this.updateUrl = updateUrl;
  }
}

function optStr(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

function isVersionMismatchCode(code: unknown): boolean {
  return code === 600 || code === "600";
}

function updateUrlFromPayload(o: Record<string, unknown>): string | undefined {
  const u = o.Update ?? o.update ?? o.updateUrl ?? o.url;
  if (typeof u === "string" && u) return u;
  return optStr(o, "updateUrl", "url", "Update", "update");
}

/**
 * 後端以業務代碼 600 要求更新客戶端（常見於 HTTP 200 的 JSON body；少數環境為 4xx body）。
 * 無 `Update` URL 時仍拋錯，由 UI 顯示通用強更提示。
 */
export function throwIfClientVersionError(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const queue: Record<string, unknown>[] = [raw as Record<string, unknown>];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const o = queue.shift()!;
    if (seen.has(o)) continue;
    seen.add(o);
    const code = o.Code ?? o.code;
    if (isVersionMismatchCode(code)) {
      throw new ClientVersionError(updateUrlFromPayload(o) ?? "");
    }
    for (const nestedKey of ["data", "result", "payload", "body"] as const) {
      const nested = o[nestedKey];
      if (nested && typeof nested === "object") {
        queue.push(nested as Record<string, unknown>);
      }
    }
  }
}
