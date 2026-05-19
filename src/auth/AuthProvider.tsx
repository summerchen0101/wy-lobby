import {
  useCallback,
  useEffect,
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
import * as apiMock from "../lib/api/mock";
import { nicknameFromEmail } from "../lib/appMeta";
import { isMockMode } from "../lib/env";
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
import { readPersistedUser, writePersistedUser } from "./userPersist";

function getInitialToken(): string | null {
  return getStoredAccessToken();
}

function getInitialRefresh(): string | null {
  return getStoredRefreshToken();
}

function initialReadyState(): boolean {
  const t = getInitialToken();
  const r = getInitialRefresh();
  if (isMockMode()) {
    return !t;
  }
  if (r) return false;
  return !t;
}

/** 有 session 憑證時從 storage 還原 user，避免 refresh bootstrap 期間誤顯示訪客大廳。 */
function getInitialUser(): User | null {
  if (typeof localStorage === "undefined") return null;
  if (isMockMode()) return null;
  if (!getInitialRefresh() && !getInitialToken()) return null;
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

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setReady(true);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleRefreshFailed = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setReady(true);
    navigate("/login", { replace: true });
  }, [navigate]);

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
      } else {
        writePersistedUser(null);
        setUser(null);
      }
    },
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredSession();
      setToken(null);
      setUser(null);
      setReady(true);
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  useEffect(() => {
    setOn401RefreshTokenHandler(async () => {
      const res = await refreshSession();
      if (!res) return null;
      applyAuthResponse(res);
      return res.accessToken;
    });
    return () => setOn401RefreshTokenHandler(null);
  }, [applyAuthResponse]);

  // 非 mock：重整時若已有 access 則不先打 /token，直接以 storage 內 access 讓下層重連 WS（過期則 proactive refresh 或 401 換發）
  // 僅在 storage 無 access、仍有 refresh 時才啟動換發
  useEffect(() => {
    if (isMockMode()) return;
    const initialT = getInitialToken();
    const initialRt = getInitialRefresh();
    if (initialT || !initialRt) return;
    let cancelled = false;
    setReady(false);
    void refreshSession()
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          clearStoredSession();
          setToken(null);
          setUser(null);
          setReady(true);
          return;
        }
        applyAuthResponse(res);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredSession();
          setToken(null);
          setUser(null);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyAuthResponse]);

  // 依 `token` 還原使用者：mock 用內建假資料；其餘用登入／refresh 已寫入之持久化，大廳則由 LOBBY_GET 之 playerInfo 經 mergeUser 併入
  useEffect(() => {
    if (token == null) {
      const noStoredSession =
        getInitialToken() == null && getInitialRefresh() == null;
      if (noStoredSession) {
        setUser(null);
        setReady(true);
      } else {
        let u = readPersistedUser();
        if (!u) {
          u = minimalSessionUser();
          writePersistedUser(u);
        }
        setUser(u);
      }
      return;
    }
    let cancelled = false;
    setReady(false);

    if (isMockMode()) {
      void apiMock
        .mockGetMe()
        .then((u) => {
          if (!cancelled) {
            setUser(u);
            writePersistedUser(u);
          }
        })
        .catch(() => {
          if (!cancelled) {
            clearStoredSession();
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          if (!cancelled) setReady(true);
        });
      return () => {
        cancelled = true;
      };
    }

    let u = readPersistedUser();
    if (!u) {
      u = minimalSessionUser();
      writePersistedUser(u);
    }
    setUser(u);
    setReady(true);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }
    if (isMockMode()) {
      const u = await apiMock.mockGetMe();
      setUser(u);
      writePersistedUser(u);
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

  const ensureFreshAccessForGame = useCallback(async (): Promise<string | null> => {
    if (isMockMode()) {
      return token?.trim() || getStoredAccessToken()?.trim() || null;
    }
    const rt = getStoredRefreshToken()?.trim();
    if (!rt) {
      return token?.trim() || getStoredAccessToken()?.trim() || null;
    }
    const res = await refreshSession();
    if (!res) {
      handleRefreshFailed();
      return null;
    }
    applyAuthResponse(res);
    return res.accessToken.trim() || null;
  }, [token, applyAuthResponse, handleRefreshFailed]);

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
      refreshUser,
      mergeUser,
      ensureFreshAccessForGame,
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
      refreshUser,
      mergeUser,
      ensureFreshAccessForGame,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
