import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  type AppLanguage,
  I18N_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from "./constants";
import { resources } from "./resources";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ["common", "errors"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: I18N_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export function setAppLanguage(lng: AppLanguage): Promise<unknown> {
  return i18n.changeLanguage(lng);
}

export function getActiveLanguage(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LANGUAGE;
}

export default i18n;
