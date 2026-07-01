import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { IoChevronBack } from "react-icons/io5";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { GATEWAY_API_MEGA_ACCOUNT_BINDING } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeMegaAccountBindingResponseBytes,
  encodeMegaAccountBindingRequestBytes,
} from "../../realtime/shopLobbyWire";
import {
  getSocureDiSessionToken,
  setSocureBindingNavigationContext,
} from "../../lib/socure/socureDevice";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { splitPhoneForBindingForm } from "../shop/splitPhoneForBindingForm";
import "../shop/ShopCheckout.css";
import "./RedeemProtectAccountView.css";

const US_STATE_CODES =
  "AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC".split(
    ",",
  );

const PHONE_COUNTRY_CODES = ["1"] as const;
const ADDRESS_COUNTRIES = ["US"] as const;

export type RedeemBindingMode = "full" | "addressOnly";

type Step = "profile" | "kyc" | "sms";

export type RedeemBindingPrefill = {
  email?: string;
  phone?: string;
};

type Props = {
  open: boolean;
  mode: RedeemBindingMode;
  onClose: () => void;
  onBound: () => void;
  bindingPrefill?: RedeemBindingPrefill;
};

function BackIcon() {
  return <IoChevronBack className="shop-checkout__back-icon" aria-hidden />;
}

function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "");
}

function combineAddress(line1: string, line2: string): string {
  const a = line1.trim();
  const b = line2.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}, ${b}`;
}

async function fileToJpegBase64(file: File): Promise<string> {
  const maxBytes = 900_000;
  if (file.size <= maxBytes && file.type.startsWith("image/")) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const comma = dataUrl.indexOf(",");
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function RedeemProtectAccountView({
  open,
  mode,
  onClose,
  onBound,
  bindingPrefill,
}: Props) {
  const { show } = useAlert();
  const { user, mergeUser } = useAuth();
  const { requestRef, gatewayRequestReady, refreshLobbyGet } = useGatewayLobby();
  const idPrefix = useId();

  const [step, setStep] = useState<Step>("profile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsAnswer, setSmsAnswer] = useState("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [documentType, setDocumentType] = useState("1");
  const [documentNumber, setDocumentNumber] = useState("");
  const [frontImageBase64, setFrontImageBase64] = useState("");
  const [backImageBase64, setBackImageBase64] = useState("");
  const [frontPreviewUrl, setFrontPreviewUrl] = useState("");
  const [backPreviewUrl, setBackPreviewUrl] = useState("");

  const dobYears = Array.from({ length: 2007 - 1920 + 1 }, (_, i) => 2007 - i);
  const dobDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const pi = "shop-checkout__input shop-checkout__input--protect";

  useEffect(() => {
    if (!open) return;
    setStep("profile");
    setBusy(false);
    setError(null);
    setSmsAnswer("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail(bindingPrefill?.email?.trim() ?? "");
    setPhoneCountry("1");
    setPhoneNumber("");
    setDobMonth("");
    setDobDay("");
    setDobYear("");
    setAddress1("");
    setAddress2("");
    setCountry("US");
    setCity("");
    setState("");
    setZip("");
    setDocumentType("1");
    setDocumentNumber("");
    setFrontImageBase64("");
    setBackImageBase64("");
    setFrontPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setBackPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });

    const rawPhone = bindingPrefill?.phone?.trim();
    if (rawPhone) {
      const split = splitPhoneForBindingForm(rawPhone);
      if (split.national) {
        setPhoneCountry(split.countryCode);
        setPhoneNumber(split.national);
      }
    }
  }, [open, bindingPrefill?.email, bindingPrefill?.phone]);

  useEffect(() => {
    if (!open) return;
    void setSocureBindingNavigationContext();
  }, [open]);

  useEffect(() => {
    return () => {
      if (frontPreviewUrl) URL.revokeObjectURL(frontPreviewUrl);
      if (backPreviewUrl) URL.revokeObjectURL(backPreviewUrl);
    };
  }, [frontPreviewUrl, backPreviewUrl]);

  const validateAddress = useCallback((): boolean => {
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Complete your address details.");
      return false;
    }
    return true;
  }, [address1, city, state, zip]);

  const goKyc = useCallback(() => {
    if (mode === "addressOnly") {
      if (!validateAddress()) return;
    } else {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !email.trim() ||
        !phoneNumber.trim() ||
        !dobMonth ||
        !dobDay ||
        !dobYear
      ) {
        setError("Complete all required profile fields.");
        return;
      }
      const digits = phoneNumber.replace(/\D/g, "");
      if (phoneCountry === "1" && digits.length !== 10) {
        setError("US phone number must be 10 digits.");
        return;
      }
      if (!validateAddress()) return;
    }
    setError(null);
    setStep("kyc");
  }, [
    mode,
    firstName,
    lastName,
    email,
    phoneNumber,
    phoneCountry,
    dobMonth,
    dobDay,
    dobYear,
    validateAddress,
  ]);

  const onImagePick = useCallback(
    async (side: "front" | "back", e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      try {
        const b64 = await fileToJpegBase64(file);
        const preview = URL.createObjectURL(file);
        if (side === "front") {
          if (frontPreviewUrl) URL.revokeObjectURL(frontPreviewUrl);
          setFrontImageBase64(b64);
          setFrontPreviewUrl(preview);
        } else {
          if (backPreviewUrl) URL.revokeObjectURL(backPreviewUrl);
          setBackImageBase64(b64);
          setBackPreviewUrl(preview);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image upload failed");
      }
    },
    [frontPreviewUrl, backPreviewUrl],
  );

  const submitBinding = useCallback(
    async (answer: string) => {
      const req = requestRef.current;
      const uid = user?.id;
      if (!req || !gatewayRequestReady) {
        setError("Not connected to server.");
        return;
      }
      if (!uid || !/^\d+$/.test(uid)) {
        setError("Missing user id");
        return;
      }
      if (!documentNumber.trim() || !frontImageBase64 || !backImageBase64) {
        setError("Provide document number and both ID photos.");
        return;
      }

      const birthday =
        mode === "full" && dobYear && dobMonth && dobDay
          ? `${dobYear}-${dobMonth}-${dobDay}`
          : "";
      const phone = mode === "full" ? normalizePhoneDigits(phoneNumber) : "";
      const countryCode = mode === "full" ? phoneCountry.trim() : "";
      const line1 = address1.trim();
      const fullAddress = combineAddress(line1, address2);

      setBusy(true);
      setError(null);
      try {
        const socureDiSessionToken = await getSocureDiSessionToken();
        if (!socureDiSessionToken) {
          setError("Device verification unavailable. Please refresh and try again.");
          return;
        }
        const data = encodeMegaAccountBindingRequestBytes({
          userID: uid,
          countryCode,
          phone,
          email: mode === "full" ? email.trim() : (user?.email ?? ""),
          answer,
          firstName: mode === "full" ? firstName.trim() : "",
          middleName: mode === "full" ? middleName.trim() : "",
          lastName: mode === "full" ? lastName.trim() : "",
          birthday,
          address: fullAddress,
          addressLine1: line1,
          country: country.trim() || "US",
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          language: "en",
          documentType: Number(documentType) || 1,
          documentNumber: documentNumber.trim(),
          frontImageContentType: "image/jpeg",
          backImageContentType: "image/jpeg",
          frontImageBase64,
          backImageBase64,
          socureDiSessionToken,
        });
        const r = await req({
          type: GATEWAY_API_MEGA_ACCOUNT_BINDING,
          data,
          debugLabel: "MEGA_ACCOUNT_BINDING_REDEEM",
        });
        const code = String(r.code ?? "");
        if (!isGatewaySuccessCode(code)) {
          setError(r.errMessage?.trim() || `Binding failed (${code})`);
          return;
        }
        const raw = r.data;
        const decoded =
          raw instanceof Uint8Array && raw.byteLength > 0
            ? decodeMegaAccountBindingResponseBytes(raw)
            : decodeMegaAccountBindingResponseBytes(new Uint8Array(0));
        if (decoded.needSMSAnswer) {
          setStep("sms");
          if (answer.trim()) {
            setError("Invalid or expired verification code.");
          }
          return;
        }
        const boundPhone = decoded.phoneNum.trim();
        if (boundPhone) mergeUser({ phone: boundPhone });
        mergeUser({ address: fullAddress });
        await refreshLobbyGet();
        onBound();
        show("Verification complete. You can continue your redemption.", {
          variant: "success",
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Binding failed");
      } finally {
        setBusy(false);
      }
    },
    [
      requestRef,
      gatewayRequestReady,
      user,
      mode,
      dobYear,
      dobMonth,
      dobDay,
      phoneNumber,
      phoneCountry,
      email,
      firstName,
      middleName,
      lastName,
      address1,
      address2,
      country,
      city,
      state,
      zip,
      documentType,
      documentNumber,
      frontImageBase64,
      backImageBase64,
      mergeUser,
      refreshLobbyGet,
      onBound,
      show,
    ],
  );

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    goKyc();
  };

  const handleKycSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitBinding("");
  };

  const handleSmsSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = smsAnswer.trim();
    if (!code) {
      setError("Enter the verification code.");
      return;
    }
    void submitBinding(code);
  };

  const handleHeaderBack = () => {
    if (step === "sms") {
      setStep("kyc");
      setError(null);
      setSmsAnswer("");
      return;
    }
    if (step === "kyc") {
      setStep("profile");
      setError(null);
      return;
    }
    onClose();
  };

  const renderAddressFields = () => (
    <>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-addr1`}>
        <input
          id={`${idPrefix}-addr1`}
          className={pi}
          name="addressLine1"
          autoComplete="address-line1"
          placeholder="Address line 1*"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          disabled={busy}
        />
      </label>
      <p className="redeem-protect__addr-hint">
        Please do not enter a PO box address. Use a valid address.
      </p>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-addr2`}>
        <input
          id={`${idPrefix}-addr2`}
          className={pi}
          name="addressLine2"
          autoComplete="address-line2"
          placeholder="Address line 2 (optional)"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          disabled={busy}
        />
      </label>
      <div className="shop-checkout__field shop-checkout__field--stack">
        <span
          className="shop-checkout__field-heading"
          id={`${idPrefix}-country-legend`}>
          Country:
        </span>
        <div
          className="redeem-protect__row2"
          role="group"
          aria-labelledby={`${idPrefix}-country-legend`}>
          <select
            id={`${idPrefix}-country`}
            className={`${pi} shop-checkout__select`}
            name="country"
            autoComplete="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={busy}>
            {ADDRESS_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}-city`}
            className={pi}
            name="city"
            autoComplete="address-level2"
            placeholder="City*"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
      <div className="shop-checkout__field shop-checkout__field--stack">
        <span
          className="shop-checkout__field-heading"
          id={`${idPrefix}-state-legend`}>
          State:
        </span>
        <div
          className="redeem-protect__row2"
          role="group"
          aria-labelledby={`${idPrefix}-state-legend`}>
          <select
            id={`${idPrefix}-state`}
            className={`${pi} shop-checkout__select`}
            name="state"
            autoComplete="address-level1"
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={busy}>
            <option value="">Select state</option>
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}-zip`}
            className={pi}
            name="zip"
            autoComplete="postal-code"
            placeholder="Zip*"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
    </>
  );

  const renderProfileForm = () => (
    <form
      className="shop-checkout__card-form shop-checkout__protect-form"
      onSubmit={handleProfileSubmit}
      noValidate>
      <fieldset disabled={busy} className="shop-checkout__fieldset-reset">
        <p className="shop-checkout__protect-lead">
          Let us help you redeem your winnings faster. Please ensure your
          details are correct.
        </p>
        <div className="shop-checkout__fields shop-checkout__fields--protect">
          {mode === "full" ? (
            <>
              <div className="redeem-protect__row3-names">
                <label className="shop-checkout__field" htmlFor={`${idPrefix}-fn`}>
                  <input
                    id={`${idPrefix}-fn`}
                    className={pi}
                    name="firstName"
                    autoComplete="given-name"
                    placeholder="FirstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className="shop-checkout__field" htmlFor={`${idPrefix}-mn`}>
                  <input
                    id={`${idPrefix}-mn`}
                    className={pi}
                    name="middleName"
                    autoComplete="additional-name"
                    placeholder="MiddleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </label>
                <label className="shop-checkout__field" htmlFor={`${idPrefix}-ln`}>
                  <input
                    id={`${idPrefix}-ln`}
                    className={pi}
                    name="lastName"
                    autoComplete="family-name"
                    placeholder="LastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>
              <label className="shop-checkout__field" htmlFor={`${idPrefix}-email`}>
                <input
                  id={`${idPrefix}-email`}
                  className={pi}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <div className="shop-checkout__field shop-checkout__field--stack">
                <span
                  className="shop-checkout__field-heading"
                  id={`${idPrefix}-phone-legend`}>
                  Phone :
                </span>
                <div
                  className="shop-checkout__row-phone"
                  role="group"
                  aria-labelledby={`${idPrefix}-phone-legend`}>
                  <select
                    id={`${idPrefix}-phone-cc`}
                    className={`${pi} shop-checkout__select shop-checkout__input--code`}
                    name="phoneCountry"
                    autoComplete="tel-country-code"
                    aria-label="Country code"
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}>
                    {PHONE_COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        +{c}
                      </option>
                    ))}
                  </select>
                  <input
                    id={`${idPrefix}-phone-num`}
                    className={`${pi} shop-checkout__input--grow`}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="PhoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="shop-checkout__field shop-checkout__field--stack">
                <span
                  className="shop-checkout__field-heading"
                  id={`${idPrefix}-dob-legend`}>
                  Date of birth
                </span>
                <div
                  className="shop-checkout__row3"
                  role="group"
                  aria-labelledby={`${idPrefix}-dob-legend`}>
                  <select
                    id={`${idPrefix}-dob-m`}
                    className={`${pi} shop-checkout__select`}
                    name="dobMonth"
                    aria-label="Month"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}>
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`${idPrefix}-dob-d`}
                    className={`${pi} shop-checkout__select`}
                    name="dobDay"
                    aria-label="Day"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}>
                    <option value="">Day</option>
                    {dobDays.map((d) => (
                      <option key={d} value={String(d).padStart(2, "0")}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    id={`${idPrefix}-dob-y`}
                    className={`${pi} shop-checkout__select`}
                    name="dobYear"
                    aria-label="Year"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}>
                    <option value="">Year</option>
                    {dobYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : null}
          {renderAddressFields()}
        </div>
        {error ? (
          <p className="shop-checkout__pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="shop-checkout__footer-hint">
          Please confirm your details. These details should match your official
          ID document.
        </p>
        <button
          type="submit"
          className="shop-checkout__submit shop-checkout__submit--blue"
          disabled={busy}>
          {busy ? "Please wait…" : "Next"}
        </button>
      </fieldset>
    </form>
  );

  const renderKycForm = () => (
    <form
      className="shop-checkout__card-form shop-checkout__protect-form"
      onSubmit={handleKycSubmit}
      noValidate>
      <fieldset disabled={busy} className="shop-checkout__fieldset-reset">
        <p className="shop-checkout__protect-lead">
          Let us help you redeem your winnings faster. Please ensure your
          details are correct.
        </p>
        <div className="shop-checkout__fields shop-checkout__fields--protect">
          <div className="redeem-protect__row2">
            <select
              id={`${idPrefix}-doctype`}
              className={`${pi} shop-checkout__select`}
              name="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}>
              <option value="1">Driver license</option>
              <option value="2">Passport</option>
              <option value="3">State ID</option>
            </select>
            <input
              id={`${idPrefix}-docnum`}
              className={pi}
              name="documentNumber"
              placeholder="number"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </div>
          <div className="redeem-protect__upload-list">
            <label
              className={
                "redeem-protect__upload-box" +
                (frontPreviewUrl ? " redeem-protect__upload-box--filled" : "")
              }
              htmlFor={`${idPrefix}-front`}>
              {frontPreviewUrl ? (
                <img
                  className="redeem-protect__upload-preview"
                  src={frontPreviewUrl}
                  alt="Front of ID"
                />
              ) : (
                <span className="redeem-protect__upload-label">FrontImage</span>
              )}
              <input
                id={`${idPrefix}-front`}
                className="redeem-protect__upload-input"
                type="file"
                accept="image/*"
                onChange={(e) => void onImagePick("front", e)}
              />
            </label>
            <label
              className={
                "redeem-protect__upload-box" +
                (backPreviewUrl ? " redeem-protect__upload-box--filled" : "")
              }
              htmlFor={`${idPrefix}-back`}>
              {backPreviewUrl ? (
                <img
                  className="redeem-protect__upload-preview"
                  src={backPreviewUrl}
                  alt="Back of ID"
                />
              ) : (
                <span className="redeem-protect__upload-label">BackImage</span>
              )}
              <input
                id={`${idPrefix}-back`}
                className="redeem-protect__upload-input"
                type="file"
                accept="image/*"
                onChange={(e) => void onImagePick("back", e)}
              />
            </label>
          </div>
        </div>
        {error ? (
          <p className="shop-checkout__pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="shop-checkout__footer-hint">
          Please confirm your details. These details should match your official
          ID document.
        </p>
        <button
          type="submit"
          className="shop-checkout__submit shop-checkout__submit--blue"
          disabled={busy}>
          {busy ? "Please wait…" : "Submit"}
        </button>
      </fieldset>
    </form>
  );

  const renderSmsForm = () => (
    <form
      className="shop-checkout__card-form shop-checkout__protect-form"
      onSubmit={handleSmsSubmit}
      noValidate>
      <fieldset disabled={busy} className="shop-checkout__fieldset-reset">
        <p className="shop-checkout__protect-lead">
          Enter the verification code sent to your phone.
        </p>
        <div className="shop-checkout__fields shop-checkout__fields--protect">
          <label className="shop-checkout__field" htmlFor={`${idPrefix}-sms`}>
            <span className="shop-checkout__label-text shop-checkout__label-text--protect">
              SMS code
            </span>
            <input
              id={`${idPrefix}-sms`}
              className={pi}
              name="smsAnswer"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code"
              value={smsAnswer}
              onChange={(e) => setSmsAnswer(e.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="shop-checkout__pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="shop-checkout__submit shop-checkout__submit--blue shop-checkout__submit--protect-sms"
          disabled={busy}>
          {busy ? "Please wait…" : "Submit"}
        </button>
      </fieldset>
    </form>
  );

  return (
    <>
      <header className="app-modal__head-row shop-checkout__head--protect">
        <button
          type="button"
          className="app-modal__head-btn"
          onClick={handleHeaderBack}
          aria-label={
            step === "profile" ? "Close" : "Back"
          }>
          <BackIcon />
        </button>
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="redeem-protect-dialog-title">
          PROTECT YOUR ACCOUNT
        </h2>
        {step === "sms" ? (
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
      <div className="redeem-protect__form-wrap">
        {step === "profile"
          ? renderProfileForm()
          : step === "kyc"
            ? renderKycForm()
            : renderSmsForm()}
      </div>
    </>
  );
}
