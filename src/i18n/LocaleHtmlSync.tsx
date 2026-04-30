import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { htmlLangFromAppLanguage } from "./constants";

/** Keeps `document.documentElement.lang` and `document.title` in sync with i18n. */
export function LocaleHtmlSync() {
  const { i18n, t } = useTranslation("common");

  useEffect(() => {
    const sync = () => {
      document.documentElement.lang = htmlLangFromAppLanguage(i18n.language);
      document.title = t("appTitle");
    };
    sync();
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, [i18n, t]);

  return null;
}
