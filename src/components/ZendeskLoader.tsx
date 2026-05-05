import { useEffect } from "react";
import i18n from "../i18n/i18n";
import {
  ensureZendeskMessengerCloseRehides,
  hideZendeskEmbed,
  zendeskSnippetScriptUrl,
} from "../lib/zendeskSupport";

const SNIPPET_ID = "ze-snippet";

declare global {
  interface Window {
    zE?: (...args: unknown[]) => void;
  }
}

function zendeskUiLocale(lng: string): string {
  return lng === "zh-TW" || lng.startsWith("zh-TW") ? "zh-TW" : "en-US";
}

function applyZendeskLocale(lng: string) {
  const locale = zendeskUiLocale(lng);
  const zE = window.zE;
  if (typeof zE !== "function") return;
  try {
    zE("messenger:set", "locale", locale);
  } catch {
    try {
      zE("webWidget", "setLocale", locale);
    } catch {
      /* Zendesk API varies by product; ignore if unsupported */
    }
  }
}

function initZendeskAfterSnippetReady(lng: string): void {
  applyZendeskLocale(lng);
  hideZendeskEmbed();
  ensureZendeskMessengerCloseRehides();
}

/**
 * 若設定 `VITE_ZENDESK_KEY`，動態載入 Zendesk snippet（見 docs/profile Support）。
 * 未設定時不載入任何第三方腳本。語系隨 i18n `languageChanged` 更新（Messaging / Classic API 擇一可用）。
 */
export function ZendeskLoader() {
  useEffect(() => {
    const key = import.meta.env.VITE_ZENDESK_KEY?.trim();
    if (!key || typeof document === "undefined") return;
    if (document.getElementById(SNIPPET_ID)) {
      initZendeskAfterSnippetReady(i18n.language);
      return;
    }
    const script = document.createElement("script");
    script.id = SNIPPET_ID;
    script.src = zendeskSnippetScriptUrl(key);
    script.async = true;
    script.fetchPriority = "high";
    script.addEventListener(
      "load",
      () => initZendeskAfterSnippetReady(i18n.language),
      { once: true },
    );
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const onLang = (lng: string) => applyZendeskLocale(lng);
    i18n.on("languageChanged", onLang);
    return () => {
      i18n.off("languageChanged", onLang);
    };
  }, []);

  return null;
}
