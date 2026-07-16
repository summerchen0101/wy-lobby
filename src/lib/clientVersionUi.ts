import type { ClientVersionError } from "./api/clientVersionError";

export const CLIENT_VERSION_REQUIRED_MESSAGE =
  "A new version is required. Please refresh the page or update the app.";

export function presentClientVersionError(err: ClientVersionError): string {
  const url = err.updateUrl?.trim();
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "A new version is required. A download page was opened in a new tab.";
  }
  return CLIENT_VERSION_REQUIRED_MESSAGE;
}
