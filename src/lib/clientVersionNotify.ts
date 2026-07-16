import type { ClientVersionError } from "./api/clientVersionError";

let onClientVersionRequired: ((err: ClientVersionError) => void) | null = null;

export function setClientVersionRequiredHandler(
  fn: ((err: ClientVersionError) => void) | null,
): void {
  onClientVersionRequired = fn;
}

export function notifyClientVersionRequired(err: ClientVersionError): void {
  onClientVersionRequired?.(err);
}
