import { supportChatUrl } from "./env";

export const ZENDESK_HELP_CENTER_URL =
  "https://luklokcasino.zendesk.com/hc/en-us";

export const ZENDESK_CONTACT_REQUEST_URL =
  "https://luklokcasino.zendesk.com/hc/en-us/requests/new";

/** Embeddable `snippet.js` URL for Messaging / Classic Zendesk widgets. */
export function zendeskSnippetScriptUrl(widgetKey: string): string {
  return `https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(widgetKey)}`;
}

const FALLBACK_MAILTO =
  "mailto:support@example.com?subject=Support%20request";

/** Hide Messaging / Classic embed UI (launcher + panel). Safe after snippet is on the page. */
export function hideZendeskEmbed(): void {
  if (typeof window === "undefined") return;
  const zE = window.zE;
  if (typeof zE !== "function") return;
  try {
    zE("messenger", "hide");
  } catch {
    /* Messaging API missing or rejects */
  }
  try {
    zE("webWidget", "hide");
  } catch {
    /* Classic API missing */
  }
}

let didRegisterMessengerCloseHide = false;

/**
 * After Messaging `close`, call `hide` again so default launcher stays off when only using a custom FAB.
 * Subscribes at most once per page lifetime.
 */
export function ensureZendeskMessengerCloseRehides(): void {
  if (
    didRegisterMessengerCloseHide ||
    typeof window === "undefined"
  )
    return;
  const zE = window.zE;
  if (typeof zE !== "function") return;
  try {
    zE("messenger:on", "close", () => {
      hideZendeskEmbed();
    });
    didRegisterMessengerCloseHide = true;
  } catch {
    /* ignore */
  }
}

/** Open Messaging (show after hide) → Classic Widget → external URL → mailto. */
export function openZendeskOrFallback(): void {
  const zE = window.zE;
  if (typeof zE === "function") {
    try {
      zE("messenger", "show");
      zE("messenger", "open");
      return;
    } catch {
      /* try Classic */
    }
    try {
      zE("webWidget", "open");
      return;
    } catch {
      /* fallback */
    }
  }
  const u = supportChatUrl();
  if (u) {
    window.open(u, "_blank", "noopener,noreferrer");
    return;
  }
  window.location.href = FALLBACK_MAILTO;
}
