import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { resolvePostLoginRedirect } from "../../auth/loginEntry";
import { ApiError } from "../../lib/api/client";
import { ClientVersionError } from "../../lib/api/clientVersionError";
import { presentClientVersionError } from "../../lib/clientVersionUi";
import { useWordData } from "../../wordData/useWordData";
import { AuthClearableInputWrap } from "./AuthClearableInputWrap";
import { AuthSocialButtons } from "./AuthSocialButtons";
import "./AuthModals.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchRegister: () => void;
  onForgotPassword: () => void;
};

/** Icon when password is hidden — click to reveal. */
function IconEyeOpen() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

/** Icon when password is visible — click to hide. */
function IconEyeClosed() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.27-1.13 2.2-2.5 2.7-3.9-1.73-4.39-6-7.5-11-7.5-1.4 0-2.75.25-3.99.7l2.2 2.2C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.05-.2 4.45-.55l.42.42L19.73 22 22 19.73 4.27 2 2 4.27zM7.53 9.8l1.55 1.55c-.05.3-.08.6-.08.9 0 1.66 1.34 3 3 3 .3 0 .6-.04.9-.1l1.55 1.55c-.84.3-1.75.5-2.7.5-2.76 0-5-2.24-5-5 0-.95.2-1.86.5-2.7z" />
    </svg>
  );
}

export function LoginModal({
  open,
  onClose,
  onSwitchRegister,
  onForgotPassword,
}: Props) {
  const w = useWordData();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const titleId = useId();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setOauthError(null);
  }, [open]);

  const finishLogin = useCallback(() => {
    onClose();
    navigate(resolvePostLoginRedirect(searchParams.get("redirect")), {
      replace: true,
    });
  }, [onClose, navigate, searchParams]);

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await login(account.trim(), password);
      finishLogin();
    } catch (err) {
      if (err instanceof ClientVersionError) {
        setFormError(presentClientVersionError(err));
        return;
      }
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="app-modal-overlay" role="presentation">
      <div
        className="app-modal app-modal--scroll-y auth-modal auth-modal--login"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <h2 id={titleId} className="app-modal__title">
            {w(3)}
          </h2>
        </div>
        <hr className="app-modal__rule" />
        <div className="app-modal__body">
          <AuthSocialButtons
            mode="signin"
            searchParams={searchParams}
            onError={setOauthError}
          />
          {oauthError ? (
            <p className="auth-modal__error">{oauthError}</p>
          ) : null}

          <div className="auth-modal__divider" aria-hidden>
            {w(5)}
          </div>

          <form onSubmit={onSignIn} noValidate>
            <fieldset
              disabled={submitting}
              className="auth-form-fieldset-reset"
            >
              <label
                className="auth-modal__field-label auth-modal__field-label--register"
                htmlFor={emailId}
              >
                {w(6)}:
              </label>
              <AuthClearableInputWrap
                variant="modal"
                value={account}
                onClear={() => setAccount("")}
                clearAriaLabel="Clear email"
              >
                <input
                  id={emailId}
                  className="auth-modal__input auth-modal__input--register"
                  name="account"
                  type="email"
                  autoComplete="username"
                  placeholder={w(7)}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                />
              </AuthClearableInputWrap>
              <label
                className="auth-modal__field-label auth-modal__field-label--register"
                htmlFor={passwordId}
              >
                {w(8)}:
              </label>
              <AuthClearableInputWrap
                variant="modal"
                modalWrap="password"
                value={password}
                onClear={() => setPassword("")}
                clearAriaLabel="Clear password"
                suffix={
                  <button
                    type="button"
                    className="auth-modal__password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                  </button>
                }
              >
                <input
                  id={passwordId}
                  className="auth-modal__input auth-modal__input--register auth-modal__input--password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={w(9)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </AuthClearableInputWrap>
              <p className="auth-modal__forgot-password">
                {w(11)}{" "}
                <button
                  type="button"
                  className="auth-modal__footer-link"
                  onClick={onForgotPassword}
                >
                  {w(12)}
                </button>
              </p>
              {formError ? (
                <p className="auth-modal__error">{formError}</p>
              ) : null}
              <button
                type="submit"
                className="auth-modal__submit"
                disabled={submitting}
              >
                {submitting ? "…" : w(3)}
              </button>
            </fieldset>
          </form>
          <p className="auth-modal__footer">
            {w(31)}{" "}
            <button
              type="button"
              className="auth-modal__footer-link"
              onClick={onSwitchRegister}
            >
              {w(18)}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
