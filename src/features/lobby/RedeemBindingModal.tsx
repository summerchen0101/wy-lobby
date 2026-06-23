import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { GATEWAY_API_MEGA_ACCOUNT_BINDING } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeMegaAccountBindingResponseBytes,
  encodeMegaAccountBindingRequestBytes,
} from "../../realtime/shopLobbyWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { splitPhoneForBindingForm } from "../shop/splitPhoneForBindingForm";
import "./RedeemBindingModal.css";
import "./RedeemFormPage.css";

const US_STATE_CODES =
  "AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC".split(
    ",",
  );

const PHONE_COUNTRY_CODES = ["1"] as const;

export type RedeemBindingMode = "full" | "addressOnly";

type Step = "profile" | "kyc";

type Props = {
  open: boolean;
  mode: RedeemBindingMode;
  onClose: () => void;
  onBound: () => void;
  bindingPrefill?: { email?: string; phone?: string };
};

function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "").replace(/^0+/, "");
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

export function RedeemBindingModal({
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
  const [needSms, setNeedSms] = useState(false);
  const [smsAnswer, setSmsAnswer] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [documentType, setDocumentType] = useState("1");
  const [documentNumber, setDocumentNumber] = useState("");
  const [frontImageBase64, setFrontImageBase64] = useState("");
  const [backImageBase64, setBackImageBase64] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("profile");
    setBusy(false);
    setError(null);
    setNeedSms(false);
    setSmsAnswer("");
    setFirstName("");
    setLastName("");
    setEmail(bindingPrefill?.email?.trim() ?? "");
    setPhoneCountry("1");
    setPhoneNumber("");
    setDobMonth("");
    setDobDay("");
    setDobYear("");
    setAddress1("");
    setCity("");
    setState("");
    setZip("");
    setDocumentType("1");
    setDocumentNumber("");
    setFrontImageBase64("");
    setBackImageBase64("");

    const rawPhone = bindingPrefill?.phone?.trim();
    if (rawPhone) {
      const split = splitPhoneForBindingForm(rawPhone);
      if (split.national) {
        setPhoneCountry(split.countryCode);
        setPhoneNumber(split.national);
      }
    }
  }, [open, bindingPrefill?.email, bindingPrefill?.phone]);

  const goKyc = useCallback(() => {
    if (mode === "addressOnly") {
      if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
        setError("Complete your address details.");
        return;
      }
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
      if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
        setError("Complete your address details.");
        return;
      }
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
    address1,
    city,
    state,
    zip,
  ]);

  const onImagePick = useCallback(
    async (side: "front" | "back", e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setError(null);
      try {
        const b64 = await fileToJpegBase64(file);
        if (side === "front") setFrontImageBase64(b64);
        else setBackImageBase64(b64);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image upload failed");
      }
    },
    [],
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
      const phone =
        mode === "full" ? normalizePhoneDigits(phoneNumber) : "";
      const countryCode = mode === "full" ? phoneCountry.trim() : "";

      setBusy(true);
      setError(null);
      try {
        const data = encodeMegaAccountBindingRequestBytes({
          userID: uid,
          countryCode,
          phone,
          email: mode === "full" ? email.trim() : (user?.email ?? ""),
          answer,
          firstName: mode === "full" ? firstName.trim() : "",
          lastName: mode === "full" ? lastName.trim() : "",
          birthday,
          address: address1.trim(),
          addressLine1: address1.trim(),
          country: "US",
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
          setNeedSms(true);
          if (answer.trim()) {
            setError("Invalid or expired verification code.");
          }
          return;
        }
        const boundPhone = decoded.phoneNum.trim();
        if (boundPhone) mergeUser({ phone: boundPhone });
        mergeUser({
          address: address1.trim(),
        });
        await refreshLobbyGet();
        setNeedSms(false);
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
      lastName,
      address1,
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
    if (needSms) {
      void submitBinding(smsAnswer.trim());
      return;
    }
    goKyc();
  };

  const handleKycSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitBinding("");
  };

  if (!open) return null;

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--scroll-y redeem-binding-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}>
        <div className="redeem-binding-modal__head">
          <button
            type="button"
            className="redeem-binding-modal__back"
            aria-label="Close"
            onClick={onClose}>
            ‹
          </button>
          <h2 className="redeem-binding-modal__title">
            {step === "profile" ? "Verify your account" : "Upload ID document"}
          </h2>
        </div>

        {step === "profile" ? (
          <form className="redeem-form-page__form" onSubmit={handleProfileSubmit}>
            {mode === "full" ? (
              <>
                <label className="redeem-form-page__label" htmlFor={`${idPrefix}-fn`}>
                  First name*
                </label>
                <input
                  id={`${idPrefix}-fn`}
                  className="redeem-form-page__input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={busy || needSms}
                />
                <label className="redeem-form-page__label" htmlFor={`${idPrefix}-ln`}>
                  Last name*
                </label>
                <input
                  id={`${idPrefix}-ln`}
                  className="redeem-form-page__input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={busy || needSms}
                />
                <label className="redeem-form-page__label" htmlFor={`${idPrefix}-email`}>
                  Email*
                </label>
                <input
                  id={`${idPrefix}-email`}
                  className="redeem-form-page__input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={busy || needSms}
                />
                <label className="redeem-form-page__label">Phone*</label>
                <div className="redeem-binding-modal__phone-row">
                  <select
                    className="redeem-form-page__input redeem-binding-modal__phone-cc"
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                    disabled={busy || needSms}>
                    {PHONE_COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        +{c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="redeem-form-page__input"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={busy || needSms}
                  />
                </div>
                <label className="redeem-form-page__label">Date of birth*</label>
                <div className="redeem-binding-modal__dob-row">
                  <input
                    className="redeem-form-page__input"
                    placeholder="YYYY"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    disabled={busy || needSms}
                  />
                  <input
                    className="redeem-form-page__input"
                    placeholder="MM"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    disabled={busy || needSms}
                  />
                  <input
                    className="redeem-form-page__input"
                    placeholder="DD"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    disabled={busy || needSms}
                  />
                </div>
              </>
            ) : null}

            <label className="redeem-form-page__label" htmlFor={`${idPrefix}-addr`}>
              Address*
            </label>
            <input
              id={`${idPrefix}-addr`}
              className="redeem-form-page__input"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              required
              disabled={busy || needSms}
            />
            <div className="redeem-binding-modal__addr-row">
              <input
                className="redeem-form-page__input"
                placeholder="City*"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={busy || needSms}
              />
              <select
                className="redeem-form-page__input"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={busy || needSms}>
                <option value="">State*</option>
                {US_STATE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                className="redeem-form-page__input"
                placeholder="ZIP*"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={busy || needSms}
              />
            </div>

            {needSms ? (
              <>
                <label className="redeem-form-page__label" htmlFor={`${idPrefix}-sms`}>
                  SMS code*
                </label>
                <input
                  id={`${idPrefix}-sms`}
                  className="redeem-form-page__input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={smsAnswer}
                  onChange={(e) => setSmsAnswer(e.target.value)}
                  disabled={busy}
                />
              </>
            ) : null}

            {error ? (
              <p className="redeem-binding-modal__error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="redeem-form-page__confirm"
              disabled={busy}>
              {busy ? "…" : needSms ? "VERIFY CODE" : "NEXT"}
            </button>
          </form>
        ) : (
          <form className="redeem-form-page__form" onSubmit={handleKycSubmit}>
            <label className="redeem-form-page__label" htmlFor={`${idPrefix}-doctype`}>
              Document type*
            </label>
            <select
              id={`${idPrefix}-doctype`}
              className="redeem-form-page__input"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              disabled={busy}>
              <option value="1">Driver license</option>
              <option value="2">Passport</option>
              <option value="3">State ID</option>
            </select>
            <label className="redeem-form-page__label" htmlFor={`${idPrefix}-docnum`}>
              Document number*
            </label>
            <input
              id={`${idPrefix}-docnum`}
              className="redeem-form-page__input"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
              disabled={busy}
            />
            <label className="redeem-form-page__label" htmlFor={`${idPrefix}-front`}>
              Front of ID*
            </label>
            <input
              id={`${idPrefix}-front`}
              type="file"
              accept="image/*"
              onChange={(e) => void onImagePick("front", e)}
              disabled={busy}
            />
            <label className="redeem-form-page__label" htmlFor={`${idPrefix}-back`}>
              Back of ID*
            </label>
            <input
              id={`${idPrefix}-back`}
              type="file"
              accept="image/*"
              onChange={(e) => void onImagePick("back", e)}
              disabled={busy}
            />

            {error ? (
              <p className="redeem-binding-modal__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="redeem-binding-modal__actions">
              <button
                type="button"
                className="redeem-binding-modal__secondary"
                disabled={busy}
                onClick={() => {
                  setStep("profile");
                  setError(null);
                }}>
                BACK
              </button>
              <button
                type="submit"
                className="redeem-form-page__confirm"
                disabled={busy}>
                {busy ? "…" : "SUBMIT"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
