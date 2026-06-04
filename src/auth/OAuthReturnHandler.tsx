import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAlert } from "../components/alert/alertContext";
import { resolvePostOAuthPath } from "../lib/oauth/backUrl";
import { useAuth } from "./useAuth";
import {
  isNewOAuthAccount,
  oauthReturnMessageForCode,
  oauthReturnUsesBlockingAlert,
  readOAuthReturnAuth,
  readOAuthReturnError,
  stripOAuthReturnQuery,
} from "./oauthReturnQuery";

/**
 * 處理 IAM OAuth 導回（對齊 official `pages/_app.tsx` query 回調）。
 * 掛在 `BrowserRouter` + `AuthProvider` + `AlertProvider` 內。
 */
export function OAuthReturnHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ingestAuthResponse } = useAuth();
  const { show, showBlockingAlert } = useAlert();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    const hasOAuth =
      searchParams.has("accessToken") || searchParams.has("errCode");
    if (!hasOAuth) return;
    if (handledRef.current === signature) return;
    handledRef.current = signature;

    const oauthErr = readOAuthReturnError(searchParams);
    if (oauthErr) {
      const message =
        oauthReturnMessageForCode(oauthErr.errCode) || oauthErr.errMsg;
      if (oauthReturnUsesBlockingAlert(oauthErr.errCode)) {
        showBlockingAlert(message);
      } else {
        show(message, { variant: "error" });
      }
      setSearchParams(stripOAuthReturnQuery(searchParams), { replace: true });
      return;
    }

    const auth = readOAuthReturnAuth(searchParams);
    if (!auth) return;

    ingestAuthResponse(auth);

    if (isNewOAuthAccount(searchParams)) {
      show("Welcome! You are signed in.", { variant: "success" });
    }

    const dest = resolvePostOAuthPath(searchParams);
    setSearchParams(stripOAuthReturnQuery(searchParams), { replace: true });
    navigate(dest, { replace: true });
  }, [
    searchParams,
    setSearchParams,
    navigate,
    ingestAuthResponse,
    show,
    showBlockingAlert,
  ]);

  return null;
}
