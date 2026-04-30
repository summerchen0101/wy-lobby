import enCommon from "./locales/en/common.json";
import enErrors from "./locales/en/errors.json";
import zhCommon from "./locales/zh-TW/common.json";
import zhErrors from "./locales/zh-TW/errors.json";

export const resources = {
  en: {
    common: enCommon,
    errors: enErrors,
  },
  "zh-TW": {
    common: zhCommon,
    errors: zhErrors,
  },
} as const;
