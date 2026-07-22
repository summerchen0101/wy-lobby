import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { IoChevronBack } from "react-icons/io5";
import { getWord } from "../../wordData/getWord";
import { useWordData } from "../../wordData/useWordData";
import { splitPhoneForBindingForm } from "./splitPhoneForBindingForm";
import type { ShopBindingFormPayload, ShopBindingPrefill } from "./types";

const PHONE_COUNTRY_CODES = ["1"] as const;

/** Digits only, leading zeros removed (e.g. 09… → 9…) for binding payload. */
function normalizePhoneDigitsForSubmit(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "");
}

type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phoneCountry"
  | "phoneNumber"
  | "dob"
  | "sms";

const FIELD_LABEL_IDS: Record<FieldKey, number> = {
  firstName: 510455,
  lastName: 510456,
  email: 510010,
  phoneCountry: 114,
  phoneNumber: 114,
  dob: 110,
  sms: 106,
};

const SCROLL_ORDER: FieldKey[] = [
  "firstName",
  "lastName",
  "email",
  "phoneCountry",
  "phoneNumber",
  "dob",
  "sms",
];

function formatMissingLabels(keys: Set<FieldKey>): string {
  const labels = SCROLL_ORDER.filter((k) => keys.has(k)).map(
    (k) => getWord(FIELD_LABEL_IDS[k]),
  );
  if (labels.length === 0) return getWord(106);
  return `Missing: ${labels.join(", ")}`;
}

function BackIcon() {
  return <IoChevronBack className="shop-checkout__back-icon" aria-hidden />;
}

type Props = {
  bindingBusy: boolean;
  bindingError: string | null;
  protectNeedSms: boolean;
  bindingPrefill?: ShopBindingPrefill;
  /** Close the protect / checkout overlay. */
  onClose: () => void;
  /** From SMS verification: return to the full binding form without leaving checkout. */
  onBackToProtectForm: () => void;
  onSubmit: (payload: ShopBindingFormPayload) => Promise<void>;
};

export function ProtectAccountView({
  bindingBusy,
  bindingError,
  protectNeedSms,
  bindingPrefill,
  onClose,
  onBackToProtectForm,
  onSubmit,
}: Props) {
  const w = useWordData();
  const idPrefix = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [smsAnswer, setSmsAnswer] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<FieldKey>>(
    () => new Set(),
  );
  const scrollInvalidIntoViewAfterSubmit = useRef(false);

  const dobYears = Array.from({ length: 2007 - 1920 + 1 }, (_, i) => 2007 - i);
  const dobDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const fieldDomId = useCallback(
    (key: FieldKey): string => {
      switch (key) {
        case "firstName":
          return `${idPrefix}-fn`;
        case "lastName":
          return `${idPrefix}-ln`;
        case "email":
          return `${idPrefix}-email`;
        case "phoneCountry":
          return `${idPrefix}-phone-cc`;
        case "phoneNumber":
          return `${idPrefix}-phone-num`;
        case "dob":
          return `${idPrefix}-dob-m`;
        case "sms":
          return `${idPrefix}-sms`;
      }
    },
    [idPrefix],
  );

  const removeInvalid = useCallback((key: FieldKey) => {
    setInvalidFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!(PHONE_COUNTRY_CODES as readonly string[]).includes(phoneCountry)) {
      setPhoneCountry("1");
    }
  }, [phoneCountry]);

  useEffect(() => {
    setInvalidFields(new Set());
    setLocalError(null);
    if (!protectNeedSms) setSmsAnswer("");
  }, [protectNeedSms]);

  useEffect(() => {
    const e = bindingPrefill?.email?.trim();
    if (!e) return;
    setEmail((prev) => (prev.trim() ? prev : e));
  }, [bindingPrefill?.email]);

  useEffect(() => {
    const raw = bindingPrefill?.phone?.trim();
    if (!raw) return;
    const split = splitPhoneForBindingForm(raw);
    if (!split.national) return;
    setPhoneNumber((pn) => {
      if (pn.replace(/\D/g, "").length > 0) return pn;
      setPhoneCountry(split.countryCode);
      return split.national;
    });
  }, [bindingPrefill?.phone]);

  useEffect(() => {
    if (invalidFields.size === 0) {
      scrollInvalidIntoViewAfterSubmit.current = false;
      return;
    }
    if (!scrollInvalidIntoViewAfterSubmit.current) return;
    scrollInvalidIntoViewAfterSubmit.current = false;
    requestAnimationFrame(() => {
      for (const key of SCROLL_ORDER) {
        if (!invalidFields.has(key)) continue;
        const el = document.getElementById(fieldDomId(key));
        if (el) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          break;
        }
      }
    });
  }, [invalidFields, fieldDomId]);

  const buildPayload = (answer: string): ShopBindingFormPayload => {
    const birthday = `${dobYear}-${dobMonth}-${dobDay}`;
    return {
      countryCode: phoneCountry.trim(),
      phone: normalizePhoneDigitsForSubmit(phoneNumber),
      email: email.trim(),
      answer,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthday,
    };
  };

  const computeInvalidFields = (): Set<FieldKey> => {
    const s = new Set<FieldKey>();
    if (!firstName.trim()) s.add("firstName");
    if (!lastName.trim()) s.add("lastName");
    if (!email.trim()) s.add("email");
    if (!phoneCountry.trim()) s.add("phoneCountry");
    const digits = phoneNumber.replace(/\D/g, "");
    if (!phoneNumber.trim() || digits.length === 0) s.add("phoneNumber");
    else if (phoneCountry === "1" && digits.length !== 10) s.add("phoneNumber");
    if (!dobMonth || !dobDay || !dobYear) s.add("dob");
    return s;
  };

  const inv = (key: FieldKey) => invalidFields.has(key);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInvalidFields(new Set());
    setLocalError(null);
    if (protectNeedSms) {
      const code = smsAnswer.trim();
      if (!code) {
        scrollInvalidIntoViewAfterSubmit.current = true;
        setInvalidFields(new Set<FieldKey>(["sms"]));
        setLocalError(getWord(106));
        return;
      }
      setInvalidFields(new Set());
      await onSubmit(buildPayload(code));
      return;
    }
    const missing = computeInvalidFields();
    if (missing.size > 0) {
      scrollInvalidIntoViewAfterSubmit.current = true;
      setInvalidFields(missing);
      setLocalError(formatMissingLabels(missing));
      return;
    }
    await onSubmit(buildPayload(""));
  };

  const pi = "shop-checkout__input shop-checkout__input--protect";

  return (
    <>
      <header className="app-modal__head-row shop-checkout__head--protect">
        <button
          type="button"
          className="app-modal__head-btn"
          onClick={
            protectNeedSms ? onBackToProtectForm : onClose
          }
          aria-label={
            protectNeedSms
              ? "Back to protect account form"
              : "Close"
          }>
          <BackIcon />
        </button>
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          {w(510453)}
        </h2>
        {protectNeedSms ? (
          <span className="app-modal__head-spacer" aria-hidden />
        ) : (
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close">
            ×
          </button>
        )}
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <form
        className="shop-checkout__card-form shop-checkout__protect-form"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate>
        <fieldset disabled={bindingBusy} className="shop-checkout__fieldset-reset">
        {protectNeedSms ? (
          <>
            <p className="shop-checkout__protect-lead">
              {w(118)}
            </p>
            <div className="shop-checkout__fields shop-checkout__fields--protect">
              <label
                className="shop-checkout__field"
                htmlFor={`${idPrefix}-sms`}>
                <span className="shop-checkout__label-text shop-checkout__label-text--protect">
                  SMS code
                </span>
                <input
                  id={`${idPrefix}-sms`}
                  className={
                    pi + (inv("sms") ? " shop-checkout__field-invalid" : "")
                  }
                  name="smsAnswer"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={w(106)}
                  value={smsAnswer}
                  aria-invalid={inv("sms")}
                  onChange={(e) => {
                    setSmsAnswer(e.target.value);
                    removeInvalid("sms");
                  }}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <p className="shop-checkout__protect-lead">
              {w(109)}
            </p>
            <div className="shop-checkout__fields shop-checkout__fields--protect">
              <div className="shop-checkout__row2">
                <label
                  className="shop-checkout__field"
                  htmlFor={`${idPrefix}-fn`}>
                  <span className="shop-checkout__label-text shop-checkout__label-text--protect">
                    {w(510455)}
                  </span>
                  <input
                    id={`${idPrefix}-fn`}
                    className={
                      pi +
                      (inv("firstName") ? " shop-checkout__field-invalid" : "")
                    }
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder={w(510455)}
                    value={firstName}
                    aria-invalid={inv("firstName")}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      removeInvalid("firstName");
                    }}
                  />
                </label>
                <label
                  className="shop-checkout__field"
                  htmlFor={`${idPrefix}-ln`}>
                  <span className="shop-checkout__label-text shop-checkout__label-text--protect">
                    {w(510456)}
                  </span>
                  <input
                    id={`${idPrefix}-ln`}
                    className={
                      pi +
                      (inv("lastName") ? " shop-checkout__field-invalid" : "")
                    }
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder={w(510456)}
                    value={lastName}
                    aria-invalid={inv("lastName")}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      removeInvalid("lastName");
                    }}
                  />
                </label>
              </div>
              <label
                className="shop-checkout__field"
                htmlFor={`${idPrefix}-email`}>
                <span className="shop-checkout__label-text shop-checkout__label-text--protect">
                  {w(510010)}
                </span>
                <input
                  id={`${idPrefix}-email`}
                  className={
                    pi + (inv("email") ? " shop-checkout__field-invalid" : "")
                  }
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder=""
                  value={email}
                  aria-invalid={inv("email")}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    removeInvalid("email");
                  }}
                />
              </label>
              <div className="shop-checkout__field shop-checkout__field--stack">
                <span
                  className="shop-checkout__field-heading"
                  id={`${idPrefix}-phone-legend`}>
                  {w(510011)}
                </span>
                <div
                  className="shop-checkout__row-phone"
                  role="group"
                  aria-labelledby={`${idPrefix}-phone-legend`}>
                  <select
                    id={`${idPrefix}-phone-cc`}
                    className={
                      "shop-checkout__input shop-checkout__input--protect shop-checkout__select shop-checkout__input--code" +
                      (inv("phoneCountry")
                        ? " shop-checkout__field-invalid"
                        : "")
                    }
                    name="phoneCountry"
                    autoComplete="tel-country-code"
                    aria-label="Country code"
                    value={phoneCountry}
                    aria-invalid={inv("phoneCountry")}
                    onChange={(e) => {
                      setPhoneCountry(e.target.value);
                      removeInvalid("phoneCountry");
                    }}>
                    {PHONE_COUNTRY_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code === "1" ? w(10507) : `+${code}`}
                      </option>
                    ))}
                  </select>
                  <input
                    id={`${idPrefix}-phone-num`}
                    className={
                      pi +
                      " shop-checkout__input--grow" +
                      (inv("phoneNumber")
                        ? " shop-checkout__field-invalid"
                        : "")
                    }
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={w(115)}
                    value={phoneNumber}
                    aria-invalid={inv("phoneNumber")}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      removeInvalid("phoneNumber");
                    }}
                  />
                </div>
              </div>
              <div className="shop-checkout__field shop-checkout__field--stack">
                <span
                  className="shop-checkout__field-heading"
                  id={`${idPrefix}-dob-legend`}>
                  {w(110)}
                </span>
                <div
                  className="shop-checkout__row3"
                  role="group"
                  aria-labelledby={`${idPrefix}-dob-legend`}>
                  <select
                    id={`${idPrefix}-dob-m`}
                    className={
                      "shop-checkout__input shop-checkout__input--protect shop-checkout__select" +
                      (inv("dob") ? " shop-checkout__field-invalid" : "")
                    }
                    name="dobMonth"
                    aria-label="Month"
                    aria-invalid={inv("dob")}
                    value={dobMonth}
                    onChange={(e) => {
                      setDobMonth(e.target.value);
                      removeInvalid("dob");
                    }}>
                    <option value="">{w(111)}</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`${idPrefix}-dob-d`}
                    className={
                      "shop-checkout__input shop-checkout__input--protect shop-checkout__select" +
                      (inv("dob") ? " shop-checkout__field-invalid" : "")
                    }
                    name="dobDay"
                    aria-label="Day"
                    aria-invalid={inv("dob")}
                    value={dobDay}
                    onChange={(e) => {
                      setDobDay(e.target.value);
                      removeInvalid("dob");
                    }}>
                    <option value="">{w(112)}</option>
                    {dobDays.map((d) => (
                      <option key={d} value={String(d).padStart(2, "0")}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`${idPrefix}-dob-y`}
                    className={
                      "shop-checkout__input shop-checkout__input--protect shop-checkout__select" +
                      (inv("dob") ? " shop-checkout__field-invalid" : "")
                    }
                    name="dobYear"
                    aria-label="Year"
                    aria-invalid={inv("dob")}
                    value={dobYear}
                    onChange={(e) => {
                      setDobYear(e.target.value);
                      removeInvalid("dob");
                    }}>
                    <option value="">{w(113)}</option>
                    {dobYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
        {bindingError || localError ? (
          <p className="shop-checkout__pay-error" role="alert">
            {bindingError ?? localError}
          </p>
        ) : null}
        {!protectNeedSms ? (
          <p className="shop-checkout__footer-hint">
            {w(510466)}
          </p>
        ) : null}
        <button
          type="submit"
          className={
            "shop-checkout__submit shop-checkout__submit--blue" +
            (protectNeedSms ? " shop-checkout__submit--protect-sms" : "")
          }
          disabled={bindingBusy}>
          {bindingBusy ? "Please wait…" : protectNeedSms ? w(120) : w(510467)}
        </button>
        </fieldset>
      </form>
    </>
  );
}
