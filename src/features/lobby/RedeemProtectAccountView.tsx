import {
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
  fetchRedeemPlayerBindingFromGateway,
  translateRedeemBindingGatewayError,
} from "./redeemBindingGate";
import { redeemPlayerBindingFromLobby } from "../../realtime/lobbyDecode";
import {
  decodeMegaAccountBindingResponseBytes,
  encodeMegaAccountBindingRequestBytes,
  type MegaAccountBindingWireResult,
} from "../../realtime/shopLobbyWire";
import {
  getSocureDiSessionToken,
  setSocureBindingNavigationContext,
} from "../../lib/socure/socureDevice";
import {
  isSocureDocvEnabled,
  launchSocureDocv,
  resetSocureDocv,
  SOCURE_DOCV_CONTAINER_SELECTOR,
} from "../../lib/socure/socureDocv";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { splitPhoneForBindingForm } from "../shop/splitPhoneForBindingForm";
import { useWordData } from "../../wordData/useWordData";
import "../shop/ShopCheckout.css";
import "./RedeemProtectAccountView.css";

const US_STATE_CODES =
  "AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC".split(
    ",",
  );

const PHONE_COUNTRY_CODES = ["1"] as const;
const ADDRESS_COUNTRIES = ["US"] as const;

export type RedeemBindingMode = "full" | "addressOnly";

type Step = "profile" | "docv";

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

  const dobYears = Array.from({ length: 2007 - 1920 + 1 }, (_, i) => 2007 - i);
  const dobDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const pi = "shop-checkout__input shop-checkout__input--protect";

  useEffect(() => {
    if (!open) {
      resetSocureDocv();
      return;
    }
    setStep("profile");
    setBusy(false);
    setError(null);
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

    const rawPhone = bindingPrefill?.phone?.trim();
    if (rawPhone) {
      const split = splitPhoneForBindingForm(rawPhone);
      if (split.national) {
        setPhoneCountry(split.countryCode);
        setPhoneNumber(split.national);
      }
    }
  }, [open, mode, bindingPrefill?.email, bindingPrefill?.phone]);

  useEffect(() => {
    if (!open) return;
    void setSocureBindingNavigationContext();
  }, [open]);

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
        if (binding.hasCellPhone && binding.hasAddress) {
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

  const beginDocvHandoff = useCallback(
    async (
      docvTransactionToken: string,
      fullAddress: string,
      boundPhone: string,
    ) => {
      setStep("docv");
      setBusy(true);
      setError(null);
      resetSocureDocv();

      const result = await launchSocureDocv(docvTransactionToken, {
        disableSmsInput: true,
        onError: () => {},
      });

      if (result.result === "success") {
        await finalizeBindingSuccess(fullAddress, boundPhone);
        return;
      }

      setError(result.errorMessage || "Identity verification failed.");
      setBusy(false);
    },
    [finalizeBindingSuccess],
  );

  const handleBindingDecoded = useCallback(
    (
      decoded: MegaAccountBindingWireResult,
      fullAddress: string,
    ) => {
      const boundPhone = decoded.phoneNum.trim();
      const docvToken = decoded.docvTransactionToken.trim();

      if (docvToken) {
        void beginDocvHandoff(docvToken, fullAddress, boundPhone);
        return;
      }

      void finalizeBindingSuccess(fullAddress, boundPhone);
    },
    [beginDocvHandoff, finalizeBindingSuccess],
  );

  const validateAddress = useCallback((): boolean => {
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Complete your address details.");
      return false;
    }
    return true;
  }, [address1, city, state, zip]);

  const validateProfile = useCallback((): boolean => {
    if (mode === "addressOnly") {
      return validateAddress();
    }
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
      return false;
    }
    const digits = phoneNumber.replace(/\D/g, "");
    if (phoneCountry === "1" && digits.length !== 10) {
      setError("US phone number must be 10 digits.");
      return false;
    }
    return validateAddress();
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
    if (!isSocureDocvEnabled()) {
      setError("Identity verification is unavailable.");
      return;
    }

    const pi = lobbyGet?.playerInfo as Record<string, unknown> | null | undefined;
    const lobbyCellPhone =
      typeof pi?.cellPhone === "string" && pi.cellPhone.trim()
        ? pi.cellPhone.trim()
        : "";

    const savedPhone =
      bindingPrefill?.phone?.trim() ||
      user?.phone?.trim() ||
      lobbyCellPhone;
    const savedPhoneSplit = savedPhone
      ? splitPhoneForBindingForm(savedPhone)
      : null;

    const birthday =
      mode === "full" && dobYear && dobMonth && dobDay
        ? `${dobYear}-${dobMonth}-${dobDay}`
        : "";
    const phone =
      mode === "full"
        ? normalizePhoneDigits(phoneNumber)
        : savedPhone
          ? normalizePhoneDigits(savedPhoneSplit?.national || savedPhone)
          : "";
    const countryCode =
      mode === "full"
        ? phoneCountry.trim()
        : savedPhoneSplit?.countryCode || "";
    const line1 = address1.trim();
    const fullAddress = combineAddress(line1, address2);

    setStep("docv");
    setBusy(true);
    setError(null);
    try {
      const socureDiSessionToken = await getSocureDiSessionToken();
      if (!socureDiSessionToken) {
        setError(
          "Device verification unavailable. Please refresh and try again.",
        );
        setBusy(false);
        return;
      }
      const data = encodeMegaAccountBindingRequestBytes({
        userID: uid,
        countryCode,
        phone,
        email: mode === "full" ? email.trim() : (user?.email ?? ""),
        answer: "",
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
        documentType: 0,
        documentNumber: "",
        frontImageContentType: "",
        backImageContentType: "",
        frontImageBase64: "",
        backImageBase64: "",
        socureDiSessionToken,
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
      handleBindingDecoded(decoded, fullAddress);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Binding failed");
      setBusy(false);
    }
  }, [
    requestRef,
    gatewayRequestReady,
    user,
    mode,
    bindingPrefill,
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
    lobbyGet,
    handleBindingDecoded,
  ]);

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setError(null);
    void submitBinding();
  };

  const handleHeaderBack = () => {
    if (step === "docv") {
      resetSocureDocv();
      setStep("profile");
      setError(null);
      setBusy(false);
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
            placeholder={w(510465)}
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
        <p className="shop-checkout__protect-lead">{w(510454)}</p>
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
                    placeholder={w(510455)}
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
                    placeholder={w(510511)}
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
                    placeholder={w(510456)}
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
                  {w(510011)}
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
                        {c === "1" ? w(10507) : `+${c}`}
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
                    placeholder={w(115)}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
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
                    className={`${pi} shop-checkout__select`}
                    name="dobMonth"
                    aria-label="Month"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}>
                    <option value="">{w(111)}</option>
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
                    <option value="">{w(112)}</option>
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
                    <option value="">{w(113)}</option>
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

  const docvContainerId = SOCURE_DOCV_CONTAINER_SELECTOR.replace(/^#/, "");

  const renderDocvStep = () => (
    <div className="shop-checkout__card-form shop-checkout__protect-form">
      <p className="shop-checkout__protect-lead">{w(510454)}</p>
      <p className="redeem-protect__docv-hint">{w(510466)}</p>
      {busy ? (
        <p className="redeem-protect__docv-hint" aria-live="polite">
          Please wait…
        </p>
      ) : null}
      <div
        id={docvContainerId}
        className="redeem-protect__docv-root"
        aria-busy={busy}
      />
      {error ? (
        <p className="shop-checkout__pay-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
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
        {step === "profile" ? renderProfileForm() : renderDocvStep()}
      </div>
    </>
  );
}
