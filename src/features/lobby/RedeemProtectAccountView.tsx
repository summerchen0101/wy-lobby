import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { IoChevronBack } from "react-icons/io5";
import { Plus } from "lucide-react";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import {
  readImageFileAsBase64,
  type ImageBase64Payload,
} from "../../lib/readImageFileAsBase64";
import { GATEWAY_API_MEGA_ACCOUNT_BINDING } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  fetchRedeemPlayerBindingFromGateway,
  translateRedeemBindingGatewayError,
} from "./redeemBindingGate";
import { redeemPlayerBindingFromLobby } from "../../realtime/lobbyDecode";
import {
  decodeMegaAccountBindingResponseBytes,
  encodeMegaAccountBindingRequestBytes,
} from "../../realtime/shopLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  isValidUsPhoneDigits,
  sanitizeUsPhoneInput,
  usPhoneValidationWordId,
} from "../../lib/usPhoneValidation";
import { getWord } from "../../wordData/getWord";
import { splitPhoneForBindingForm } from "../shop/splitPhoneForBindingForm";
import { useWordData } from "../../wordData/useWordData";
import {
  REDEEM_DOCUMENT_TYPES,
  US_STATES,
} from "./redeemKycFormConstants";
import "../shop/ShopCheckout.css";
import "./RedeemProtectAccountView.css";

const ADDRESS_COUNTRIES = ["US"] as const;
const LICENSE_ID_PLACEHOLDER = "License ID";

export type RedeemBindingMode = "full" | "addressOnly";

type Step = "profile" | "idPhotos";

export type RedeemBindingPrefill = {
  email?: string;
  phone?: string;
  address?: string;
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

function resolveBindingContact(
  bindingPrefill: RedeemBindingPrefill | undefined,
  user: { email?: string | null; phone?: string | null } | null | undefined,
  lobbyCellPhone: string,
): { email: string; phone: string; countryCode: string } {
  const email =
    bindingPrefill?.email?.trim() || user?.email?.trim() || "";
  const savedPhone =
    bindingPrefill?.phone?.trim() || user?.phone?.trim() || lobbyCellPhone;
  const split = savedPhone ? splitPhoneForBindingForm(savedPhone) : null;
  return {
    email,
    phone: savedPhone
      ? normalizePhoneDigits(split?.national || savedPhone)
      : "",
    countryCode: split?.countryCode || "1",
  };
}

export function RedeemProtectAccountView({
  open,
  mode,
  onClose,
  onBound,
  bindingPrefill,
}: Props) {
  const w = useWordData();
  const { show } = useAlert();
  const { user, mergeUser } = useAuth();
  const { requestRef, gatewayRequestReady, refreshLobbyGet, lobbyGet } =
    useGatewayLobby();
  const idPrefix = useId();

  const [step, setStep] = useState<Step>("profile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [frontImage, setFrontImage] = useState<ImageBase64Payload | null>(null);
  const [backImage, setBackImage] = useState<ImageBase64Payload | null>(null);

  const pi = "shop-checkout__input shop-checkout__input--protect";

  const emailReadOnly = Boolean(
    bindingPrefill?.email?.trim() || user?.email?.trim(),
  );
  const phoneReadOnly = mode === "addressOnly";
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const opening = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!opening) return;

    setStep("profile");
    setBusy(false);
    setError(null);

    const pi = lobbyGet?.playerInfo as Record<string, unknown> | null | undefined;
    const lobbyCellPhone =
      typeof pi?.cellPhone === "string" && pi.cellPhone.trim()
        ? pi.cellPhone.trim()
        : "";
    const contact = resolveBindingContact(bindingPrefill, user, lobbyCellPhone);
    setEmail(contact.email);
    setPhoneCountry(contact.countryCode);
    setPhoneNumber(contact.phone);

    const prefillAddress =
      bindingPrefill?.address?.trim() || user?.address?.trim() || "";
    setFirstName("");
    setLastName("");
    setDobMonth("");
    setDobDay("");
    setDobYear("");
    setAddress1(prefillAddress);
    setAddress2("");
    setCountry("US");
    setCity("");
    setState("");
    setZip("");
    setDocumentType("");
    setDocumentNumber("");
    setFrontImage(null);
    setBackImage(null);
  }, [open, mode, bindingPrefill, user, lobbyGet]);

  /** Lobby/user 晚到時只補空白欄位，不覆寫玩家已輸入內容。 */
  useEffect(() => {
    if (!open || !wasOpenRef.current) return;

    const pi = lobbyGet?.playerInfo as Record<string, unknown> | null | undefined;
    const lobbyCellPhone =
      typeof pi?.cellPhone === "string" && pi.cellPhone.trim()
        ? pi.cellPhone.trim()
        : "";
    const contact = resolveBindingContact(bindingPrefill, user, lobbyCellPhone);
    const prefillAddress =
      bindingPrefill?.address?.trim() || user?.address?.trim() || "";

    setEmail((prev) => (prev.trim() ? prev : contact.email));
    setPhoneCountry((prev) => prev || contact.countryCode);
    setPhoneNumber((prev) =>
      normalizePhoneDigits(prev) ? prev : contact.phone,
    );
    setAddress1((prev) => (prev.trim() ? prev : prefillAddress));
  }, [open, bindingPrefill, user, lobbyGet]);

  const fetchBindingState = useCallback(async () => {
    const req = requestRef.current;
    if (!req || !gatewayRequestReady) {
      return redeemPlayerBindingFromLobby(null);
    }
    return fetchRedeemPlayerBindingFromGateway(req);
  }, [requestRef, gatewayRequestReady]);

  const finalizeBindingSuccess = useCallback(
    async (fullAddress: string, boundPhone: string) => {
      try {
        if (boundPhone) mergeUser({ phone: boundPhone });
        if (fullAddress) mergeUser({ address: fullAddress });
        await refreshLobbyGet();
        const binding = await fetchBindingState();
        if (binding.hasFrontImage) {
          onBound();
          show(w(1209), { variant: "success" });
          return;
        }
        show(w(510512), { variant: "info" });
        onClose();
      } finally {
        setBusy(false);
      }
    },
    [mergeUser, refreshLobbyGet, fetchBindingState, onBound, show, onClose, w],
  );

  const validateAddress = useCallback((): boolean => {
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Complete your address details.");
      return false;
    }
    return true;
  }, [address1, city, state, zip]);

  const validateProfile = useCallback((): boolean => {
    if (!email.trim()) {
      setError("Missing account email.");
      return false;
    }
    const phoneDigits = normalizePhoneDigits(phoneNumber);
    if (!phoneDigits) {
      setError("Missing account phone number.");
      return false;
    }
    const cc = phoneCountry.trim() || "1";
    if (cc === "1" && !isValidUsPhoneDigits(phoneDigits)) {
      const wordId = usPhoneValidationWordId(phoneDigits);
      setError(wordId !== null ? getWord(wordId) : getWord(555));
      return false;
    }
    if (mode === "addressOnly") {
      return validateAddress();
    }
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !dobMonth ||
      !dobDay ||
      !dobYear ||
      !documentType ||
      !documentNumber.trim()
    ) {
      setError("Complete all required profile fields.");
      return false;
    }
    return validateAddress();
  }, [
    mode,
    email,
    phoneCountry,
    phoneNumber,
    firstName,
    lastName,
    dobMonth,
    dobDay,
    dobYear,
    documentType,
    documentNumber,
    validateAddress,
  ]);

  const submitBinding = useCallback(async () => {
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
    if (!frontImage || !backImage) {
      setError("Upload both sides of your ID.");
      return;
    }

    const phoneDigits = normalizePhoneDigits(phoneNumber);
    const countryCode = phoneCountry.trim() || "1";

    const birthday =
      mode === "full" && dobYear && dobMonth && dobDay
        ? `${dobYear}-${dobMonth}-${String(dobDay).padStart(2, "0")}`
        : "";
    const line1 = address1.trim();
    const fullAddress = combineAddress(line1, address2);
    const parsedDocumentType = Number(documentType);

    setBusy(true);
    setError(null);
    try {
      const data = encodeMegaAccountBindingRequestBytes({
        userID: uid,
        countryCode,
        phone: phoneDigits,
        email: email.trim(),
        answer: "",
        firstName: mode === "full" ? firstName.trim() : "",
        middleName: "",
        lastName: mode === "full" ? lastName.trim() : "",
        birthday,
        address: fullAddress,
        addressLine1: line1,
        country: country.trim() || "US",
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        language: "en",
        documentType: mode === "full" ? parsedDocumentType : 0,
        documentNumber: mode === "full" ? documentNumber.trim() : "",
        frontImageContentType: frontImage.contentType,
        backImageContentType: backImage.contentType,
        frontImageBase64: frontImage.base64,
        backImageBase64: backImage.base64,
        socureDiSessionToken: "",
      });
      const r = await req({
        type: GATEWAY_API_MEGA_ACCOUNT_BINDING,
        data,
        debugLabel: "MEGA_ACCOUNT_BINDING_REDEEM",
      });
      const code = String(r.code ?? "");
      if (!isGatewaySuccessCode(code)) {
        setError(translateRedeemBindingGatewayError(code, r.errMessage));
        setBusy(false);
        return;
      }
      const raw = r.data;
      const decoded =
        raw instanceof Uint8Array && raw.byteLength > 0
          ? decodeMegaAccountBindingResponseBytes(raw)
          : decodeMegaAccountBindingResponseBytes(new Uint8Array(0));
      void finalizeBindingSuccess(fullAddress, decoded.phoneNum.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Binding failed");
      setBusy(false);
    }
  }, [
    requestRef,
    gatewayRequestReady,
    user,
    mode,
    email,
    phoneCountry,
    phoneNumber,
    dobYear,
    dobMonth,
    dobDay,
    documentType,
    documentNumber,
    firstName,
    lastName,
    address1,
    address2,
    country,
    city,
    state,
    zip,
    frontImage,
    backImage,
    finalizeBindingSuccess,
  ]);

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setError(null);
    setStep("idPhotos");
  };

  const validateIdPhotos = useCallback((): boolean => {
    if (!frontImage || !backImage) {
      setError("Upload both sides of your ID.");
      return false;
    }
    return true;
  }, [frontImage, backImage]);

  const handleIdPhotosSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateIdPhotos()) return;
    setError(null);
    void submitBinding();
  };

  const handleImagePick = async (
    side: "front" | "back",
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const payload = await readImageFileAsBase64(file);
      if (side === "front") setFrontImage(payload);
      else setBackImage(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read image.");
    }
  };

  const handleHeaderBack = () => {
    if (step === "idPhotos") {
      setStep("profile");
      setError(null);
      setBusy(false);
      return;
    }
    onClose();
  };

  const imagePreviewSrc = (payload: ImageBase64Payload | null) =>
    payload ? `data:${payload.contentType};base64,${payload.base64}` : null;

  const renderAddressFields = () => (
    <>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-addr1`}>
        <input
          id={`${idPrefix}-addr1`}
          className={pi}
          name="addressLine1"
          autoComplete="address-line1"
          placeholder={w(510457)}
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          disabled={busy}
        />
      </label>
      <p className="redeem-protect__addr-hint">{w(510458)}</p>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-addr2`}>
        <input
          id={`${idPrefix}-addr2`}
          className={pi}
          name="addressLine2"
          autoComplete="address-line2"
          placeholder={w(510459)}
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          disabled={busy}
        />
      </label>
      <div className="shop-checkout__field shop-checkout__field--stack">
        <span
          className="shop-checkout__field-heading"
          id={`${idPrefix}-country-legend`}>
          {w(510460)}
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
                {w(510461)}
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}-city`}
            className={pi}
            name="city"
            autoComplete="address-level2"
            placeholder={w(510462)}
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
          {w(510463)}
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
            <option value="">{w(510464)}</option>
            {US_STATES.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}-zip`}
            className={pi}
            name="zip"
            autoComplete="postal-code"
            placeholder={w(510465)}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
    </>
  );

  const renderDocumentFields = () => (
    <div className="shop-checkout__field shop-checkout__field--stack">
      <span
        className="shop-checkout__field-heading"
        id={`${idPrefix}-doc-legend`}>
        {w(510508)}
      </span>
      <div
        className="redeem-protect__row2"
        role="group"
        aria-labelledby={`${idPrefix}-doc-legend`}>
        <select
          id={`${idPrefix}-doc-type`}
          className={`${pi} shop-checkout__select`}
          name="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={busy}>
          <option value="">{w(510508)}</option>
          {REDEEM_DOCUMENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          id={`${idPrefix}-doc-num`}
          className={pi}
          name="documentNumber"
          autoComplete="off"
          placeholder={LICENSE_ID_PLACEHOLDER}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          disabled={busy}
        />
      </div>
    </div>
  );

  const renderDobFields = () => (
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
          className={`${pi} shop-checkout__select`}
          name="dobMonth"
          aria-label="Month"
          value={dobMonth}
          onChange={(e) => setDobMonth(e.target.value)}
          disabled={busy}>
          <option value="">{w(111)}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={String(m).padStart(2, "0")}>
              {m}
            </option>
          ))}
        </select>
        <input
          id={`${idPrefix}-dob-d`}
          className={pi}
          name="dobDay"
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          aria-label="Day"
          placeholder={w(112)}
          maxLength={2}
          value={dobDay}
          onChange={(e) =>
            setDobDay(e.target.value.replace(/\D/g, "").slice(0, 2))
          }
          disabled={busy}
        />
        <input
          id={`${idPrefix}-dob-y`}
          className={pi}
          name="dobYear"
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          aria-label="Year"
          placeholder={w(113)}
          maxLength={4}
          value={dobYear}
          onChange={(e) =>
            setDobYear(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          disabled={busy}
        />
      </div>
    </div>
  );

  const renderContactFields = () => (
    <>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-email`}>
        <input
          id={`${idPrefix}-email`}
          className={
            pi +
            " shop-checkout__input--email-prefill" +
            (emailReadOnly ? " shop-checkout__input--readonly" : "")
          }
          name="email"
          type="email"
          autoComplete="email"
          readOnly={emailReadOnly}
          placeholder={emailReadOnly ? "" : w(510010)}
          value={email}
          onChange={(e) => {
            if (emailReadOnly) return;
            setEmail(e.target.value);
          }}
          disabled={busy}
        />
      </label>
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
            className={pi + " shop-checkout__input--code-readonly"}
            name="phoneCountry"
            type="text"
            readOnly
            tabIndex={-1}
            aria-label="Country code"
            value={phoneCountry}
            disabled={busy}
          />
          <input
            id={`${idPrefix}-phone-num`}
            className={pi + " shop-checkout__input--grow"}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={w(115)}
            value={phoneNumber}
            readOnly={phoneReadOnly}
            onChange={(e) => {
              if (phoneReadOnly) return;
              setPhoneNumber(sanitizeUsPhoneInput(e.target.value));
            }}
            disabled={busy}
          />
        </div>
      </div>
    </>
  );

  const renderNameFields = () => (
    <div className="redeem-protect__row2">
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-fn`}>
        <input
          id={`${idPrefix}-fn`}
          className={pi}
          name="firstName"
          autoComplete="given-name"
          placeholder={w(510455)}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </label>
      <label className="shop-checkout__field" htmlFor={`${idPrefix}-ln`}>
        <input
          id={`${idPrefix}-ln`}
          className={pi}
          name="lastName"
          autoComplete="family-name"
          placeholder={w(510456)}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </label>
    </div>
  );

  const renderProfileForm = () => (
    <form
      className="shop-checkout__card-form shop-checkout__protect-form"
      onSubmit={handleProfileSubmit}
      noValidate>
      <fieldset disabled={busy} className="shop-checkout__fieldset-reset">
        <p className="shop-checkout__protect-lead">{w(510454)}</p>
        <div className="shop-checkout__fields shop-checkout__fields--protect">
          {renderContactFields()}
          {mode === "full" ? (
            <>
              {renderDobFields()}
              {renderNameFields()}
              {renderAddressFields()}
              {renderDocumentFields()}
            </>
          ) : (
            renderAddressFields()
          )}
        </div>
        {error ? (
          <p className="shop-checkout__pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="shop-checkout__footer-hint">{w(510466)}</p>
        <button
          type="submit"
          className="shop-checkout__submit shop-checkout__submit--blue"
          disabled={busy}>
          {busy ? "Please wait…" : w(510506)}
        </button>
      </fieldset>
    </form>
  );

  const renderIdUploadSlot = (
    side: "front" | "back",
    captionWordId: number,
    image: ImageBase64Payload | null,
    inputId: string,
  ) => (
    <div className="redeem-protect__upload-slot">
      <span className="redeem-protect__upload-caption">{w(captionWordId)}:</span>
      <label
        className={`redeem-protect__upload-box${image ? " redeem-protect__upload-box--filled" : ""}`}
        htmlFor={inputId}>
        {image ? (
          <img
            className="redeem-protect__upload-preview"
            src={imagePreviewSrc(image) ?? undefined}
            alt=""
          />
        ) : (
          <Plus className="redeem-protect__upload-plus" strokeWidth={1.75} aria-hidden />
        )}
        <input
          id={inputId}
          className="redeem-protect__upload-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleImagePick(side, e)}
        />
      </label>
    </div>
  );

  const renderIdPhotoStep = () => (
    <form
      className="shop-checkout__card-form shop-checkout__protect-form"
      onSubmit={handleIdPhotosSubmit}
      noValidate>
      <fieldset disabled={busy} className="shop-checkout__fieldset-reset">
        <p className="shop-checkout__protect-lead">{w(510454)}</p>
        <div className="redeem-protect__upload-list">
          {renderIdUploadSlot("front", 510509, frontImage, `${idPrefix}-front-img`)}
          {renderIdUploadSlot("back", 510510, backImage, `${idPrefix}-back-img`)}
        </div>
        {error ? (
          <p className="shop-checkout__pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="shop-checkout__footer-hint">{w(510466)}</p>
        <button
          type="submit"
          className="shop-checkout__submit shop-checkout__submit--blue"
          disabled={busy}>
          {busy ? "Please wait…" : w(510507)}
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
          aria-label={step === "profile" ? "Close" : "Back"}>
          <BackIcon />
        </button>
        <h2
          className="app-modal__title--abs-center shop-checkout__title"
          id="redeem-protect-dialog-title">
          {w(510453)}
        </h2>
        <button
          type="button"
          className="app-modal__close"
          onClick={onClose}
          aria-label="Close">
          ×
        </button>
      </header>
      <hr className="app-modal__rule shop-checkout__head-rule" />
      <div className="redeem-protect__form-wrap">
        {step === "profile" ? renderProfileForm() : renderIdPhotoStep()}
      </div>
    </>
  );
}
