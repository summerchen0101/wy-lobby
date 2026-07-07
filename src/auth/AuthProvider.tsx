import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { agentDebugLog } from "../debug/agentDebugIngest";
import { useNavigate } from "react-router-dom";
import {
  completeSignUp,
  login as apiLogin,
  signUp as apiSignUp,
} from "../lib/api/auth";
import { nicknameFromEmail } from "../lib/appMeta";
import {
  setOn401RefreshTokenHandler,
  setUnauthorizedHandler,
} from "../lib/api/client";
import type { AuthResponse, RegisterBody, User } from "../lib/api/types";
import { minimalSessionUser, resolveUserAfterAuth } from "./applyAuthResponse";
import { AuthContext } from "./auth-context";
import { refreshSession } from "./refreshSession";
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthResponse,
} from "./sessionPersist";
import { useProactiveTokenRefresh } from "./useProactiveTokenRefresh";
import { AUTH_LOGIN_ENTRY_PATH } from "./loginEntry";
import { shouldRefreshStoredSessionOnStartup } from "./sessionStartup";
import { setOnSessionRefreshFailedHandler } from "./sessionRefreshNotify";
import { readPersistedUser, writePersistedUser } from "./userPersist";
import { markFreshLoginWelcomeVoicePending } from "../lib/lobbyWelcomeVoiceGate";

function getInitialToken(): string | null {
  return getStoredAccessToken();
}

function getInitialRefresh(): string | null {
  return getStoredRefreshToken();
}

function initialReadyState(): boolean {
  const t = getInitialToken();
  const r = getInitialRefresh();
  if (r) return false;
  return !t;
}

/** 僅在 storage 有 access 時還原 user；僅 refresh 時由 bootstrap 驗證，不顯示幽靈已登入。 */
function getInitialUser(): User | null {
  if (typeof localStorage === "undefined") return null;
  if (!getInitialToken()?.trim()) return null;
  return readPersistedUser() ?? minimalSessionUser();
}

/** 後端登入／註冊未帶 `user` 時，供 session／RequireAuth 使用之最小使用者（Gateway 仍用 userID 0）。 */
function syntheticUserFromAccount(account: string): User {
  const t = account.trim();
  const displayName = (t ? nicknameFromEmail(t) : "") || "Player";
  return { id: "0", displayName };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  /** 樂觀還原 access（即使同時有 refresh），避免 bootstrap 完成前 token 為 null 導致 RequireAuth／WS 誤判。 */
  const [token, setToken] = useState<string | null>(() => getInitialToken());
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [ready, setReady] = useState(initialReadyState);
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  const applyAuthResponse = useCallback((res: AuthResponse) => {
    persistAuthResponse(res);
    setToken(res.accessToken);
    const u = resolveUserAfterAuth(res);
    writePersistedUser(u);
    setUser(u);
  }, []);

  const logout = useCallback(
    (options?: { redirectTo?: "home" | "login" }) => {
      clearStoredSession();
      setToken(null);
      setUser(null);
      setReady(true);
      navigate(
        options?.redirectTo === "login" ? AUTH_LOGIN_ENTRY_PATH : "/",
        { replace: true },
      );
    },
    [navigate],
  );

  const invalidateSessionToLogin = useCallback(() => {
    logout({ redirectTo: "login" });
  }, [logout]);

  const handleRefreshFailed = invalidateSessionToLogin;

  useLayoutEffect(() => {
    setOnSessionRefreshFailedHandler(invalidateSessionToLogin);
    return () => setOnSessionRefreshFailedHandler(null);
  }, [invalidateSessionToLogin]);

  useProactiveTokenRefresh({
    token,
    onRefreshed: applyAuthResponse,
    onRefreshFailed: handleRefreshFailed,
  });

  useEffect(() => {
    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    if (prev === undefined) return;
    if (prev && !token) {
      // #region agent log
      agentDebugLog({
        hypothesisId: "C",
        location: "AuthProvider.tsx:token",
        message: "token_cleared",
        data: { hadRefresh: Boolean(getInitialRefresh()) },
      });
      // #endregion
    }
  }, [token]);

  const setSessionFromAuth = useCallback(
    (res: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
      user?: User | null | undefined;
    }) => {
      persistAuthResponse(res);
      setToken(res.accessToken);
      if (res.user) {
        writePersistedUser(res.user);
        setUser(res.user);
        markFreshLoginWelcomeVoicePending();
      } else {
        writePersistedUser(null);
        setUser(null);
      }
    },
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleRefreshFailed();
    });
    return () => setUnauthorizedHandler(null);
  }, [handleRefreshFailed]);

  useEffect(() => {
    setOn401RefreshTokenHandler(async () => {
      const res = await refreshSession();
      if (!res?.accessToken?.trim()) {
        handleRefreshFailed();
        return null;
      }
      applyAuthResponse(res);
      return res.accessToken;
    });
    return () => setOn401RefreshTokenHandler(null);
  }, [applyAuthResponse, handleRefreshFailed]);

  // 啟動驗證：無 access、access 已過期、或缺 expiresAt 時以 refresh 換發；失敗清 session 並導向大廳登入
  useEffect(() => {
    const initialRt = getStoredRefreshToken()?.trim();
    if (!initialRt) return;
    if (!shouldRefreshStoredSessionOnStartup()) return;

    let cancelled = false;
    setReady(false);
    void refreshSession()
      .then((res) => {
        if (cancelled) return;
        if (!res?.accessToken?.trim()) {
          handleRefreshFailed();
          return;
        }
        applyAuthResponse(res);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          handleRefreshFailed();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyAuthResponse, handleRefreshFailed]);

  // 依 `token` 還原使用者：登入／refresh 已寫入之持久化；大廳則由 LOBBY_GET 之 playerInfo 經 mergeUser 併入
  useEffect(() => {
    if (token == null) {
      setUser(null);
      const noStoredSession =
        getStoredAccessToken() == null && getStoredRefreshToken() == null;
      if (noStoredSession) {
        setReady(true);
      }
      return;
    }
    let u = readPersistedUser();
    if (!u) {
      u = minimalSessionUser();
      writePersistedUser(u);
    }
    setUser(u);

    /** 啟動 refresh 進行中時 ready 由下方 effect 統一置 true；勿在此 setReady(false/true) 以免 WS 連兩次。 */
    if (
      getStoredRefreshToken()?.trim() &&
      shouldRefreshStoredSessionOnStartup()
    ) {
      return;
    }

    setReady(true);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }
    const u = readPersistedUser();
    if (u) setUser(u);
  }, [token]);

  const mergeUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      const base = prev ?? { id: "0", displayName: "Player" };
      const next: User = { ...base, ...patch };
      writePersistedUser(next);
      return next;
    });
  }, []);

  const login = useCallback(
    async (account: string, password: string) => {
      const res = await apiLogin({ account, password });
      const user = res.user ?? syntheticUserFromAccount(account);
      setSessionFromAuth({ ...res, user });
    },
    [setSessionFromAuth],
  );

  const signUp = useCallback(async (body: RegisterBody) => {
    return apiSignUp(body);
  }, []);

  const register = useCallback(
    async (body: RegisterBody) => {
      const res = await completeSignUp(body);
      const user = res.user ?? syntheticUserFromAccount(body.email);
      setSessionFromAuth({ ...res, user });
    },
    [setSessionFromAuth],
  );

  const ingestAuthResponse = useCallback(
    (res: AuthResponse) => {
      const user = res.user ?? { id: "0", displayName: "Player" };
      setSessionFromAuth({ ...res, user });
    },
    [setSessionFromAuth],
  );

  const tryRefreshSession = useCallback(async (): Promise<boolean> => {
    const rt = getStoredRefreshToken()?.trim();
    if (!rt) {
      invalidateSessionToLogin();
      return false;
    }
    const res = await refreshSession();
    if (!res) {
      return false;
    }
    applyAuthResponse(res);
    return true;
  }, [applyAuthResponse, invalidateSessionToLogin]);

  const ensureFreshAccessForGame = useCallback(async (): Promise<string | null> => {
    const rt = getStoredRefreshToken()?.trim();
    if (!rt) {
      handleRefreshFailed();
      return null;
    }
    const res = await refreshSession();
    if (!res?.accessToken?.trim()) {
      handleRefreshFailed();
      return null;
    }
    applyAuthResponse(res);
    return res.accessToken.trim();
  }, [applyAuthResponse, handleRefreshFailed]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      signUp,
      register,
      ingestAuthResponse,
      logout,
      invalidateSessionToLogin,
      refreshUser,
      mergeUser,
      ensureFreshAccessForGame,
      tryRefreshSession,
    }),
    [
      user,
      token,
      ready,
      login,
      signUp,
      register,
      ingestAuthResponse,
      logout,
      invalidateSessionToLogin,
      refreshUser,
      mergeUser,
      ensureFreshAccessForGame,
      tryRefreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
