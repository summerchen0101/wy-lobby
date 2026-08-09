import {
  extractPhoneDigits,
  isValidUsPhoneDigits,
  usPhoneValidationWordId,
} from "../../lib/usPhoneValidation";
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
  const digits = extractPhoneDigits(fields.phoneNumber);
  if (!fields.phoneNumber.trim() || digits.length === 0) s.add("phoneNumber");
  else if (fields.phoneCountry === "1" && !isValidUsPhoneDigits(digits)) {
    s.add("phoneNumber");
  }
  return s;
}

function formatShopBindingInvalidFieldMessage(
  key: ShopBindingFieldKey,
  fields: ShopBindingFormFields,
): string {
  if (key === "phoneNumber") {
    const digits = extractPhoneDigits(fields.phoneNumber);
    if (
      fields.phoneNumber.trim() &&
      digits.length > 0 &&
      fields.phoneCountry === "1"
    ) {
      const wordId = usPhoneValidationWordId(digits);
      if (wordId !== null) return getWord(wordId);
    }
  }
  return `Missing: ${getWord(FIELD_LABEL_IDS[key])}`;
}

export function formatShopBindingValidationError(
  fields: ShopBindingFormFields,
  keys: Set<ShopBindingFieldKey>,
): string {
  const messages = SCROLL_ORDER.filter((k) => keys.has(k)).map((k) =>
    formatShopBindingInvalidFieldMessage(k, fields),
  );
  if (messages.length === 0) return getWord(106);
  return messages.join(" ");
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
