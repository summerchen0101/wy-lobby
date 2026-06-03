import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppleLogin from "react-apple-login";
import { IoChevronBack } from "react-icons/io5";
import { FaApple } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { fetchAppleOAuthState } from "../../lib/api/oauth";
import { ApiError } from "../../lib/api/client";
import { appleOAuthClientId, getApiBase, isMockMode } from "../../lib/env";
import { buildOAuthBackUrl } from "../../lib/oauth/backUrl";
import "./AuthModals.css";

type Props = {
  open: boolean;
  onClose: () => void;
  /** @deprecated 僅 Apple／Google 登入；保留 props 以免呼叫端改動 */
  onSwitchRegister: () => void;
  /** @deprecated */
  onForgotPassword: () => void;
};

export function LoginModal({
  open,
  onClose,
}: Props) {
  const { ingestAuthResponse } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const titleId = useId();

  const [appleState, setAppleState] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appleTriggerRef = useRef<HTMLDivElement>(null);

  const apiBase = getApiBase();
  const appleRedirectUri = apiBase
    ? `${apiBase}/api/v1/apple/auth`
    : "/api/v1/apple/auth";

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
    setError(null);
    setAppleState("");
  }, [open]);

  const finishLogin = useCallback(() => {
    onClose();
    const redirect = searchParams.get("redirect");
    if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
      navigate(redirect, { replace: true });
    }
  }, [onClose, navigate, searchParams]);

  const handleAppleLogin = useCallback(async () => {
    setError(null);
    setAppleLoading(true);
    try {
      if (isMockMode()) {
        const res = await fetchAppleOAuthState(buildOAuthBackUrl(searchParams));
        void res;
        ingestAuthResponse({
          accessToken: "mock.apple.oauth",
          refreshToken: "mock.refresh.apple",
          expiresIn: 3600,
          user: { id: "0", displayName: "Apple Player" },
        });
        finishLogin();
        return;
      }
      const backUrl = buildOAuthBackUrl(searchParams);
      const state = await fetchAppleOAuthState(backUrl);
      setAppleState(state);
      requestAnimationFrame(() => {
        const el =
          appleTriggerRef.current?.querySelector(
            "#appleid-signin",
          ) as HTMLElement | null;
        el?.click();
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Apple sign-in failed";
      setError(msg);
    } finally {
      setAppleLoading(false);
    }
  }, [searchParams, ingestAuthResponse, finishLogin]);

  if (!open) return null;

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--scroll-y auth-modal auth-modal--login"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-modal__head-row">
          <button
            type="button"
            className="app-modal__head-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <IoChevronBack aria-hidden />
          </button>
          <h2 id={titleId} className="app-modal__title--abs-center">
            Login
          </h2>
          <button
            type="button"
            className="app-modal__head-btn auth-modal__head-btn--close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <hr className="app-modal__rule" />
        <div className="app-modal__body">
          <div className="auth-modal__social-stack">
            <button
              type="button"
              className="auth-modal__social-btn auth-modal__social-btn--apple"
              disabled={appleLoading}
              onClick={() => void handleAppleLogin()}
            >
              <FaApple aria-hidden size={20} />
              {appleLoading ? "…" : "Continue with Apple"}
            </button>
          </div>
          <div ref={appleTriggerRef} hidden aria-hidden>
            {appleState ? (
              <AppleLogin
                clientId={appleOAuthClientId()}
                redirectURI={appleRedirectUri}
                scope="email name"
                state={appleState}
                usePopup={false}
                responseMode="form_post"
              />
            ) : null}
          </div>
          {error ? <p className="auth-modal__error">{error}</p> : null}
          <p className="auth-modal__text auth-modal__text--muted">
            Google sign-in will be available soon.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
