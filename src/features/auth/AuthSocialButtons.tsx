import { useCallback, useRef, useState } from "react";
import AppleLogin from "react-apple-login";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  appendAppMetaToOAuthUrl,
  buildAppleAuthRedirectUri,
  fetchAppleOAuthState,
  fetchOAuthLink,
} from "../../lib/api/oauth";
import { ApiError } from "../../lib/api/client";
import { appleOAuthClientId, getApiBase } from "../../lib/env";
import { buildOAuthBackUrl } from "../../lib/oauth/backUrl";
import { useWordData } from "../../wordData/useWordData";

type Props = {
  mode: "signin" | "signup";
  searchParams: URLSearchParams;
  onError: (message: string) => void;
};

export function AuthSocialButtons({ mode, searchParams, onError }: Props) {
  const w = useWordData();
  const [appleState, setAppleState] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const appleTriggerRef = useRef<HTMLDivElement>(null);

  const appleRedirectUri = buildAppleAuthRedirectUri(getApiBase());

  const label = mode === "signin" ? w(4) : w(19);
  const appleAria =
    mode === "signin" ? "Log in with Apple" : "Sign up with Apple";
  const googleAria =
    mode === "signin" ? "Log in with Google" : "Sign up with Google";

  const handleGoogleLogin = useCallback(async () => {
    onError("");
    setGoogleLoading(true);
    try {
      const backUrl = buildOAuthBackUrl(searchParams);
      const url = await fetchOAuthLink("google", backUrl);
      window.location.assign(appendAppMetaToOAuthUrl(url));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Google sign-in failed";
      onError(msg);
      setGoogleLoading(false);
    }
  }, [onError, searchParams]);

  const handleAppleLogin = useCallback(async () => {
    onError("");
    setAppleLoading(true);
    try {
      const backUrl = buildOAuthBackUrl(searchParams);
      const state = await fetchAppleOAuthState(backUrl);
      setAppleState(state);
      requestAnimationFrame(() => {
        const el = appleTriggerRef.current?.querySelector(
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
      onError(msg);
    } finally {
      setAppleLoading(false);
    }
  }, [onError, searchParams]);

  return (
    <>
      <p className="auth-modal__social-label">{label}</p>
      <div className="auth-modal__social-row">
        <button
          type="button"
          className="auth-modal__social-btn auth-modal__social-btn--apple"
          aria-label={appleAria}
          disabled={appleLoading}
          onClick={() => void handleAppleLogin()}
        >
          <FaApple aria-hidden size={22} />
          <span>APPLE</span>
        </button>
        <button
          type="button"
          className="auth-modal__social-btn auth-modal__social-btn--google"
          aria-label={googleAria}
          disabled={googleLoading}
          onClick={() => void handleGoogleLogin()}
        >
          <FcGoogle aria-hidden size={22} />
          <span>GOOGLE</span>
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
    </>
  );
}
