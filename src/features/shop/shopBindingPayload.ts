import { getWord } from "../../wordData/getWord";
import type { ShopBindingFormPayload } from "./types";

export type ShopBindingFieldKey =
  | "email"
  | "phoneCountry"
  | "phoneNumber"
  | "sms";

const FIELD_LABEL_IDS: Record<ShopBindingFieldKey, number> = {
  email: 510010,
  phoneCountry: 114,
  phoneNumber: 114,
  sms: 106,
};

const SCROLL_ORDER: ShopBindingFieldKey[] = [
  "email",
  "phoneCountry",
  "phoneNumber",
  "sms",
];

export type ShopBindingFormFields = {
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  birthday: string;
};

/** Digits only, leading zeros removed (e.g. 09… → 9…) for binding payload. */
export function normalizePhoneDigitsForSubmit(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "");
}

export function buildShopBindingPayload(
  fields: ShopBindingFormFields,
  answer: string,
): ShopBindingFormPayload {
  return {
    countryCode: fields.phoneCountry.trim(),
    phone: normalizePhoneDigitsForSubmit(fields.phoneNumber),
    email: fields.email.trim(),
    answer,
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    birthday: fields.birthday.trim(),
  };
}

export function computeShopBindingInvalidFields(
  fields: ShopBindingFormFields,
  emailReadOnly: boolean,
): Set<ShopBindingFieldKey> {
  const s = new Set<ShopBindingFieldKey>();
  if (!emailReadOnly && !fields.email.trim()) s.add("email");
  if (!fields.phoneCountry.trim()) s.add("phoneCountry");
  const digits = fields.phoneNumber.replace(/\D/g, "");
  if (!fields.phoneNumber.trim() || digits.length === 0) s.add("phoneNumber");
  else if (fields.phoneCountry === "1" && digits.length !== 10) {
    s.add("phoneNumber");
  }
  return s;
}

export function formatShopBindingMissingLabels(
  keys: Set<ShopBindingFieldKey>,
): string {
  const labels = SCROLL_ORDER.filter((k) => keys.has(k)).map(
    (k) => getWord(FIELD_LABEL_IDS[k]),
  );
  if (labels.length === 0) return getWord(106);
  return `Missing: ${labels.join(", ")}`;
}

export function shopBindingFieldDomSuffix(key: ShopBindingFieldKey): string {
  switch (key) {
    case "email":
      return "email";
    case "phoneCountry":
      return "phone-cc";
    case "phoneNumber":
      return "phone-num";
    case "sms":
      return "sms";
  }
}
