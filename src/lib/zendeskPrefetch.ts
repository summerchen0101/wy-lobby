import { zendeskSnippetScriptUrl } from "./zendeskSupport";

/** Early hints so CDN connection + snippet load start before React/App mount (speeds first Support click). */
function installZendeskResourceHints(widgetKey: string): void {
  if (typeof document === "undefined") return;
  if (document.head.querySelector("link[data-zd-snippet=\"preconnect\"]")) return;

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://static.zdassets.com";
  preconnect.crossOrigin = "anonymous";
  preconnect.dataset.zdSnippet = "preconnect";

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "script";
  preload.href = zendeskSnippetScriptUrl(widgetKey);
  preload.crossOrigin = "anonymous";
  preload.dataset.zdSnippet = "preload";

  document.head.append(preconnect, preload);
}

const key = import.meta.env.VITE_ZENDESK_KEY?.trim();
if (key) {
  installZendeskResourceHints(key);
}
