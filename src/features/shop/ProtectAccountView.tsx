import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { IoChevronBack } from "react-icons/io5";
import { sanitizeUsPhoneInput } from "../../lib/usPhoneValidation";
import { getWord } from "../../wordData/getWord";
import { useWordData } from "../../wordData/useWordData";
import { splitPhoneForBindingForm } from "./splitPhoneForBindingForm";
import {
  buildShopBindingPayload,
  computeShopBindingInvalidFields,
  formatShopBindingValidationError,
  shopBindingFieldDomSuffix,
  type ShopBindingFieldKey,
  type ShopBindingFormFields,
} from "./shopBindingPayload";
import type { ShopBindingFormPayload, ShopBindingPrefill } from "./types";

const PHONE_COUNTRY_CODE = "1";

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
  const prefilledEmail = bindingPrefill?.email?.trim() ?? "";
  const emailReadOnly = prefilledEmail.length > 0;

  const [firstName, setFirstName] = useState(
    bindingPrefill?.firstName?.trim() ?? "",
  );
  const [lastName, setLastName] = useState(
    bindingPrefill?.lastName?.trim() ?? "",
  );
  const [birthday, setBirthday] = useState(
    bindingPrefill?.birthday?.trim() ?? "",
  );
  const [email, setEmail] = useState(prefilledEmail);
  const [phoneCountry, setPhoneCountry] = useState(PHONE_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsAnswer, setSmsAnswer] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Set<ShopBindingFieldKey>>(
    () => new Set(),
  );
  const scrollInvalidIntoViewAfterSubmit = useRef(false);

  const fieldDomId = useCallback(
    (key: ShopBindingFieldKey): string =>
      `${idPrefix}-${shopBindingFieldDomSuffix(key)}`,
    [idPrefix],
  );

  const formFields = useCallback(
    (): ShopBindingFormFields => ({
      email,
      phoneCountry,
      phoneNumber,
      firstName,
      lastName,
      birthday,
    }),
    [email, phoneCountry, phoneNumber, firstName, lastName, birthday],
  );

  const removeInvalid = useCallback((key: ShopBindingFieldKey) => {
    setInvalidFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    setInvalidFields(new Set());
    setLocalError(null);
    if (!protectNeedSms) setSmsAnswer("");
  }, [protectNeedSms]);

  useEffect(() => {
    const fn = bindingPrefill?.firstName?.trim();
    if (fn) setFirstName(fn);
    const ln = bindingPrefill?.lastName?.trim();
    if (ln) setLastName(ln);
    const bd = bindingPrefill?.birthday?.trim();
    if (bd) setBirthday(bd);
  }, [
    bindingPrefill?.firstName,
    bindingPrefill?.lastName,
    bindingPrefill?.birthday,
  ]);

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
    setPhoneCountry(split.countryCode);
    setPhoneNumber((prev) => {
      if (prev.replace(/\D/g, "").length > 0) return prev;
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
    const order: ShopBindingFieldKey[] = [
      "email",
      "phoneCountry",
      "phoneNumber",
      "sms",
    ];
    requestAnimationFrame(() => {
      for (const key of order) {
        if (!invalidFields.has(key)) continue;
        const el = document.getElementById(fieldDomId(key));
        if (el) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          break;
        }
      }
    });
  }, [invalidFields, fieldDomId]);

  const inv = (key: ShopBindingFieldKey) => invalidFields.has(key);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInvalidFields(new Set());
    setLocalError(null);
    if (protectNeedSms) {
      const code = smsAnswer.trim();
      if (!code) {
        scrollInvalidIntoViewAfterSubmit.current = true;
        setInvalidFields(new Set<ShopBindingFieldKey>(["sms"]));
        setLocalError(getWord(106));
        return;
      }
      setInvalidFields(new Set());
      await onSubmit(buildShopBindingPayload(formFields(), code));
      return;
    }
    const missing = computeShopBindingInvalidFields(
      formFields(),
      emailReadOnly,
    );
    if (missing.size > 0) {
      scrollInvalidIntoViewAfterSubmit.current = true;
      setInvalidFields(missing);
      setLocalError(formatShopBindingValidationError(formFields(), missing));
      return;
    }
    await onSubmit(buildShopBindingPayload(formFields(), ""));
  };

  const pi = "shop-checkout__input shop-checkout__input--protect";

  return (
    <>
      <header className="app-modal__head-row shop-checkout__head--protect">
        {protectNeedSms ? (
          <button
            type="button"
            className="app-modal__head-btn"
            onClick={onBackToProtectForm}
            aria-label="Back to verify details form">
            <BackIcon />
          </button>
        ) : (
          <span className="app-modal__head-spacer" aria-hidden />
        )}
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="shop-checkout-dialog-title">
          {w(108)}
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
        <fieldset
          disabled={bindingBusy}
          className="shop-checkout__fieldset-reset">
          {protectNeedSms ? (
            <>
              <p className="shop-checkout__protect-lead">{w(118)}</p>
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
              <p className="shop-checkout__protect-lead">{w(109)}</p>
              <div className="shop-checkout__fields shop-checkout__fields--protect">
                <input
                  id={`${idPrefix}-email`}
                  className={
                    pi +
                    " shop-checkout__input--email-prefill" +
                    (emailReadOnly ? " shop-checkout__input--readonly" : "") +
                    (inv("email") ? " shop-checkout__field-invalid" : "")
                  }
                  name="email"
                  type="email"
                  autoComplete="email"
                  readOnly={emailReadOnly}
                  placeholder={emailReadOnly ? "" : w(510010)}
                  value={email}
                  aria-invalid={inv("email")}
                  onChange={(e) => {
                    if (emailReadOnly) return;
                    setEmail(e.target.value);
                    removeInvalid("email");
                  }}
                />
                <div className="shop-checkout__field shop-checkout__field--stack">
                  <span
                    className="shop-checkout__field-heading shop-checkout__field-heading--phone"
                    id={`${idPrefix}-phone-legend`}>
                    {w(114)}
                  </span>
                  <div
                    className="shop-checkout__row-phone"
                    role="group"
                    aria-labelledby={`${idPrefix}-phone-legend`}>
                    <input
                      id={`${idPrefix}-phone-cc`}
                      className={
                        pi +
                        " shop-checkout__input--code-readonly" +
                        (inv("phoneCountry")
                          ? " shop-checkout__field-invalid"
                          : "")
                      }
                      name="phoneCountry"
                      type="text"
                      readOnly
                      tabIndex={-1}
                      aria-label="Country code"
                      value={phoneCountry}
                    />
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
                        setPhoneNumber(sanitizeUsPhoneInput(e.target.value));
                        removeInvalid("phoneNumber");
                      }}
                    />
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
            <p className="shop-checkout__footer-hint">{w(510466)}</p>
          ) : null}
          <button
            type="submit"
            className={
              "shop-checkout__submit shop-checkout__submit--blue" +
              (protectNeedSms ? " shop-checkout__submit--protect-sms" : "")
            }
            disabled={bindingBusy}>
            {bindingBusy
              ? "Please wait…"
              : protectNeedSms
                ? w(120)
                : w(510467)}
          </button>
        </fieldset>
      </form>
    </>
  );
}
