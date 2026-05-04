import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/useAuth";
import type { Game } from "../lib/api/types";
import { useWallet } from "../wallet/walletContext";
import {
  getGatewayWsUrlForDevLog,
  isMockMode,
  isWsLobbyGamesEnabled,
} from "../lib/env";
import {
  GATEWAY_API_GET_JACKPOT_INFO,
  GATEWAY_API_JACKPOT_INFO_PUSH,
  GATEWAY_API_LOBBY_GET,
  GATEWAY_API_SEND_MESSAGE_PUSH,
  GATEWAY_API_SERVER_LOGIN,
  GATEWAY_API_SLOT_JACKPOT_PUSH,
  GATEWAY_API_WITHDRAW_SUCCESS_PUSH,
} from "./gatewayApi";
import { decodeLobbyJackpotDisplayTriple } from "./jackpotLobbyWire";
import type {
  GatewayWsConnectionState,
  GatewayWsRequestFn,
  GatewayWsStateMeta,
} from "./gatewayWs";
import { isGatewaySuccessCode } from "./gatewayWire";
import { hexPreview } from "./bytesHexPreview";
import {
  decodeLobbyGetResponseBytes,
  type LobbyGetDecoded,
  lobbyDecodedGamesToApiGames,
  lobbyDecodedToUserPatch,
} from "./lobbyDecode";
import { useGatewayWs } from "./useGatewayWs";
import {
  GatewayLobbyContext,
  type GatewayLobbyContextValue,
  type PaymentFinishListener,
} from "./gatewayLobbyContext";
import {
  tryDecodeSendMessagePushToPaymentPush,
  userPatchFromPaymentPush,
} from "./shopLobbyWire";
import { decodeWithdrawSuccessPushBytes } from "./withdrawLobbyWire";
import type { WithdrawSuccessPushListener } from "./gatewayLobbyContext";
import type { ActiveWallet } from "../wallet/walletContext";
import { wireUInt64Field } from "./wireUint64";
import { LobbyHydrationGate } from "./LobbyHydrationGate";

const LOBBY_GET_POLL_MS = 15_000;

function wsSessionInvalidCodesFromEnv(): Set<string> {
  const raw = (
    import.meta.env.VITE_WS_SESSION_INVALID_CODES ?? "401,403"
  ).trim();
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(parts.length ? parts : ["401", "403"]);
}

function isGatewaySessionInvalidCode(code: unknown): boolean {
  return wsSessionInvalidCodesFromEnv().has(String(code ?? "").trim());
}

function devGatewayWsProbeEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  return import.meta.env.VITE_DEV_GATEWAY_WS !== "false";
}

/** 握手屢敗後最多再排程幾次重連；見 `gatewayWs` 之 `maxReconnectAttempts`。 */
function wsMaxHandshakeReconnectAttemptsFromEnv(): number {
  const raw = (import.meta.env.VITE_WS_MAX_HANDSHAKE_ATTEMPTS ?? "6").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 6;
  return Math.floor(n);
}

/** 逗號分隔之 `CloseEvent.code`；空則僅依重試上限判定。 */
function wsAuthFailureCloseCodesFromEnv(): readonly number[] {
  const raw = (import.meta.env.VITE_WS_AUTH_FAILURE_CLOSE_CODES ?? "").trim();
  if (!raw) return [];
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** 連線後若未在 N ms 內 open 則放棄此次握手；0 關閉。預設 15000。 */
function wsHandshakeTimeoutMsFromEnv(): number {
  const raw = (import.meta.env.VITE_WS_HANDSHAKE_TIMEOUT_MS ?? "15000").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 15_000;
  return Math.floor(n);
}

export function GatewayLobbyProvider({ children }: { children: ReactNode }) {
  const { token, user, mergeUser, logout } = useAuth();
  const { setActiveWallet, activeWallet } = useWallet();
  const wsLobbyEnabled = isWsLobbyGamesEnabled();
  const gatewayWsEnabled =
    !isMockMode() && (devGatewayWsProbeEnabled() || wsLobbyEnabled);
  const shouldRunLobbyGetOnOpen =
    (import.meta.env.DEV && import.meta.env.VITE_DEV_LOBBY_GET !== "false") ||
    wsLobbyEnabled;

  /** 會經 Gateway WS 發送首轮 LOBBY_GET 的情境（含訪客、dev LOBBY_GET probe） */
  const gateActive = gatewayWsEnabled && shouldRunLobbyGetOnOpen;

  const wsMaxReconnectAttempts = useMemo(
    () => wsMaxHandshakeReconnectAttemptsFromEnv(),
    [],
  );
  const wsFatalReconnectCloseCodes = useMemo(
    () => wsAuthFailureCloseCodesFromEnv(),
    [],
  );
  const wsHandshakeTimeoutMs = useMemo(
    () => wsHandshakeTimeoutMsFromEnv(),
    [],
  );

  const [lobbyGames, setLobbyGames] = useState<Game[] | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [liveJackpotAmounts, setLiveJackpotAmounts] = useState<
    readonly [number, number, number] | null
  >(null);
  const [lobbyGet, setLobbyGet] = useState<LobbyGetDecoded | null>(null);
  const [gatewayRequestReady, setGatewayRequestReady] = useState(false);
  /** 首轮 onOpen LOBBY_GET 是否已落定（與輪詢 refresh 無關）；無閘門時視為 done */
  const [lobbyWsBootstrapDone, setLobbyWsBootstrapDone] = useState(
    () => !gateActive,
  );

  const requestRef = useRef<GatewayWsRequestFn | null>(null);
  /** header 切換 GC/SC 時用上一則 JP 封包依目前錢包重解，不必等 push */
  const lastJackpotWireRef = useRef<{
    apiType: number;
    data: Uint8Array;
  } | null>(null);
  const prevActiveWalletForJackpotSyncRef = useRef<ActiveWallet | null>(null);
  const paymentFinishListenersRef = useRef(new Set<PaymentFinishListener>());
  const withdrawSuccessListenersRef = useRef(
    new Set<WithdrawSuccessPushListener>(),
  );
  const sessionTokenRef = useRef("");
  const hadTokenRef = useRef(Boolean(token?.trim()));
  /** 避免 `auth_rejected` 連續觸發多次 alert + logout */
  const wsHandshakeAuthLockRef = useRef(false);
  /** 同一次連線週期內 `reconnect_exhausted` 只通知一次 */
  const wsReconnectExhaustedNotifiedRef = useRef(false);
  /** 上一則 `closed` 的 meta（供 `connecting` 判斷是否為重試，避免全螢幕閘門反覆打開） */
  const lastWsClosedMetaRef = useRef<GatewayWsStateMeta | undefined>(undefined);

  useEffect(() => {
    wsHandshakeAuthLockRef.current = false;
    wsReconnectExhaustedNotifiedRef.current = false;
    lastWsClosedMetaRef.current = undefined;
  }, [token]);

  useEffect(() => {
    if (!gateActive) setLobbyWsBootstrapDone(true);
  }, [gateActive]);

  useEffect(() => {
    if (!gateActive) return;
    setLobbyWsBootstrapDone(false);
    lastWsClosedMetaRef.current = undefined;
  }, [gateActive, token]);

  useEffect(() => {
    sessionTokenRef.current = token?.trim() ?? "";
  }, [token]);

  const subscribeWithdrawSuccessPush = useCallback(
    (listener: WithdrawSuccessPushListener) => {
      withdrawSuccessListenersRef.current.add(listener);
      return () => {
        withdrawSuccessListenersRef.current.delete(listener);
      };
    },
    [],
  );

  const subscribePaymentFinish = useCallback(
    (listener: PaymentFinishListener) => {
      paymentFinishListenersRef.current.add(listener);
      return () => {
        paymentFinishListenersRef.current.delete(listener);
      };
    },
    [],
  );

  const runLobbyGetRequest = useCallback(
    async (
      request: GatewayWsRequestFn,
      options?: { bootstrap?: boolean },
    ) => {
      if (wsLobbyEnabled) setLobbyLoading(true);
      try {
        const r = await request({
          type: GATEWAY_API_LOBBY_GET,
          data: new Uint8Array(0),
          debugLabel: "LOBBY_GET",
        });
        const raw = r.data;
        const len = raw instanceof Uint8Array ? raw.byteLength : 0;
        if (String(r.code) === "200") {
          if (len > 0 && raw instanceof Uint8Array) {
            try {
              const decoded = decodeLobbyGetResponseBytes(raw);
              const items = lobbyDecodedGamesToApiGames(decoded);
              if (sessionTokenRef.current) {
                const userPatch = lobbyDecodedToUserPatch(decoded);
                if (Object.keys(userPatch).length > 0) {
                  mergeUser(userPatch);
                  if (
                    userPatch.lobbyWalletType === "GC" ||
                    userPatch.lobbyWalletType === "SC"
                  ) {
                    setActiveWallet(userPatch.lobbyWalletType);
                  }
                }
              }
              setLobbyGames(items);
              setLobbyGet(decoded);
              if (wsLobbyEnabled) setLobbyError(null);
            } catch (decodeErr) {
              console.warn("[gateway-ws] LOBBY_GET decode failed", decodeErr);
              setLobbyGet(null);
              if (wsLobbyEnabled) {
                setLobbyGames([]);
                setLobbyError("Could not decode lobby games");
              } else {
                setLobbyGames(null);
              }
            }
          } else {
            setLobbyGames([]);
            setLobbyGet(null);
            if (wsLobbyEnabled) setLobbyError(null);
          }
        } else {
          const codeStr = String(r.code ?? "");
          if (
            wsLobbyEnabled &&
            sessionTokenRef.current &&
            isGatewaySessionInvalidCode(codeStr)
          ) {
            logout();
            return;
          }
          setLobbyGet(null);
          if (wsLobbyEnabled) {
            setLobbyGames([]);
            setLobbyError(
              r.errMessage?.trim() ||
                `Lobby request failed (${String(r.code ?? "")})`,
            );
          } else {
            setLobbyGames(null);
          }
        }
      } catch (e) {
        console.warn("[gateway-ws] LOBBY_GET failed", e);
        setLobbyGet(null);
        if (wsLobbyEnabled) {
          setLobbyGames([]);
          setLobbyError(
            e instanceof Error ? e.message : "Lobby WebSocket request failed",
          );
        } else {
          setLobbyGames(null);
        }
      } finally {
        if (wsLobbyEnabled) setLobbyLoading(false);
        if (options?.bootstrap) setLobbyWsBootstrapDone(true);
      }
    },
    [logout, mergeUser, setActiveWallet, wsLobbyEnabled],
  );

  const refreshLobbyGet = useCallback(async () => {
    if (!shouldRunLobbyGetOnOpen) return;
    const request = requestRef.current;
    if (!request) return;
    await runLobbyGetRequest(request);
  }, [runLobbyGetRequest, shouldRunLobbyGetOnOpen]);

  useEffect(() => {
    if (!gatewayWsEnabled || !gatewayRequestReady || !shouldRunLobbyGetOnOpen) {
      return;
    }

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshLobbyGet();
    };

    const id = window.setInterval(tick, LOBBY_GET_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshLobbyGet();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    gatewayRequestReady,
    gatewayWsEnabled,
    refreshLobbyGet,
    shouldRunLobbyGetOnOpen,
  ]);

  const getRequestBasicExtras = useCallback((): Record<string, unknown> => {
    const uid = user?.id;
    if (!uid || !/^\d+$/.test(uid)) {
      return { userID: 0 };
    }
    try {
      return { userID: wireUInt64Field(uid) };
    } catch {
      return { userID: 0 };
    }
  }, [user?.id]);

  useEffect(() => {
    const has = Boolean(token?.trim());
    if (hadTokenRef.current && !has) {
      paymentFinishListenersRef.current.clear();
      withdrawSuccessListenersRef.current.clear();
      lastJackpotWireRef.current = null;
    }
    hadTokenRef.current = has;
  }, [token]);

  useEffect(() => {
    if (!token?.trim() || !gatewayWsEnabled) return;
    const cached = lastJackpotWireRef.current;
    if (!cached) return;
    const triple = decodeLobbyJackpotDisplayTriple(
      cached.data,
      cached.apiType,
      {
        wallet: activeWallet,
      },
    );
    if (triple) setLiveJackpotAmounts(triple);
  }, [activeWallet, gatewayWsEnabled, token]);

  useEffect(() => {
    if (!gatewayWsEnabled || !token?.trim() || !gatewayRequestReady) return;
    const prev = prevActiveWalletForJackpotSyncRef.current;
    prevActiveWalletForJackpotSyncRef.current = activeWallet;
    if (prev === null || prev === activeWallet) return;
    const req = requestRef.current;
    if (!req) return;
    void req({
      type: GATEWAY_API_GET_JACKPOT_INFO,
      data: new Uint8Array(0),
      debugLabel: "GET_JACKPOT_INFO(active_wallet_changed)",
    }).catch((e) => {
      console.warn(
        "[gateway-ws] GET_JACKPOT_INFO after wallet change failed",
        e,
      );
    });
  }, [activeWallet, gatewayRequestReady, gatewayWsEnabled, token]);

  useGatewayWs({
    enabled: gatewayWsEnabled,
    wsToken: token?.trim() ?? "",
    clientVer: import.meta.env.VITE_CLIENT_VER?.trim() || undefined,
    maxReconnectAttempts: wsMaxReconnectAttempts,
    fatalReconnectCloseCodes: wsFatalReconnectCloseCodes,
    handshakeTimeoutMs: wsHandshakeTimeoutMs,
    getRequestBasicExtras,
    onState: (s: GatewayWsConnectionState, meta?: GatewayWsStateMeta) => {
      if (s === "open") {
        wsReconnectExhaustedNotifiedRef.current = false;
        lastWsClosedMetaRef.current = undefined;
      }

      if (s !== "open") {
        setGatewayRequestReady(false);
        if (gateActive) {
          const skipBootstrapReset =
            s === "closed" &&
            (meta?.shutdownReason === "client_close" ||
              meta?.shutdownReason === "reconnect_exhausted" ||
              meta?.shutdownReason === "auth_rejected" ||
              meta?.shutdownReason === "transport");
          const skipConnectingBootstrapBlock =
            s === "connecting" &&
            lastWsClosedMetaRef.current?.shutdownReason === "transport";
          if (!skipBootstrapReset && !skipConnectingBootstrapBlock) {
            setLobbyWsBootstrapDone(false);
          }
        }
      }

      if (s === "closed") {
        lastWsClosedMetaRef.current = meta;
      }

      if (import.meta.env.DEV) {
        console.info("[gateway-ws][dev] state:", s, {
          wsUrl: getGatewayWsUrlForDevLog({ token: token ?? "" }),
          shutdownReason: meta?.shutdownReason,
          closeCode: meta?.closeCode,
        });
      }

      if (
        s === "closed" &&
        token?.trim() &&
        gatewayWsEnabled
      ) {
        if (meta?.shutdownReason === "auth_rejected") {
          if (wsHandshakeAuthLockRef.current) return;
          wsHandshakeAuthLockRef.current = true;
          if (gateActive) setLobbyWsBootstrapDone(true);
          window.alert("Please log in again.");
          logout();
          return;
        }
        if (meta?.shutdownReason === "reconnect_exhausted") {
          if (wsReconnectExhaustedNotifiedRef.current) return;
          wsReconnectExhaustedNotifiedRef.current = true;
          if (gateActive) setLobbyWsBootstrapDone(true);
          const msg =
            "Could not connect to the game server. Check your network and try again.";
          if (wsLobbyEnabled) {
            setLobbyError(msg);
          } else {
            window.alert(msg);
          }
        }
      }
    },
    onResponse: (msg) => {
      const codeStr = String(msg.code ?? "");
      if (!isGatewaySuccessCode(codeStr)) return;
      const t = Number(msg.type);
      const raw = msg.data;
      if (
        t === GATEWAY_API_SLOT_JACKPOT_PUSH ||
        t === GATEWAY_API_JACKPOT_INFO_PUSH ||
        t === GATEWAY_API_GET_JACKPOT_INFO
      ) {
        if (!(raw instanceof Uint8Array) || raw.byteLength === 0) return;
        lastJackpotWireRef.current = { apiType: t, data: raw.slice() };
        const triple = decodeLobbyJackpotDisplayTriple(raw, t, {
          wallet: activeWallet,
        });
        if (triple) setLiveJackpotAmounts(triple);
        return;
      }
      if (t === GATEWAY_API_WITHDRAW_SUCCESS_PUSH) {
        if (!(raw instanceof Uint8Array) || raw.byteLength === 0) return;
        const push = decodeWithdrawSuccessPushBytes(raw);
        if (!push) return;
        for (const fn of withdrawSuccessListenersRef.current) {
          try {
            fn(push);
          } catch (e) {
            console.warn("[gateway-ws] withdraw success push listener", e);
          }
        }
        return;
      }
      if (t === GATEWAY_API_SEND_MESSAGE_PUSH) {
        const push = tryDecodeSendMessagePushToPaymentPush(
          t,
          raw instanceof Uint8Array ? raw : undefined,
        );
        if (!push) return;
        const patch = userPatchFromPaymentPush(push);
        if (patch) mergeUser(patch);
        for (const fn of paymentFinishListenersRef.current) {
          try {
            fn(push);
          } catch (e) {
            console.warn("[gateway-ws] payment finish listener", e);
          }
        }
      }
    },
    onOpen: async ({ request }) => {
      requestRef.current = request;
      setGatewayRequestReady(true);

      if (shouldRunLobbyGetOnOpen) {
        await runLobbyGetRequest(request, { bootstrap: true });
      }

      try {
        const loginRes = await request({
          type: GATEWAY_API_SERVER_LOGIN,
          data: new Uint8Array(0),
          debugLabel: "SERVER_LOGIN",
        });
        const loginRaw = loginRes.data;
        const loginLen =
          loginRaw instanceof Uint8Array ? loginRaw.byteLength : 0;
        if (import.meta.env.DEV) {
          console.info("[gateway-ws][dev] SERVER_LOGIN", {
            code: loginRes.code,
            type: loginRes.type,
            errMessage: loginRes.errMessage,
            dataLength: loginLen,
            dataHexPreview24:
              loginLen > 0 && loginRaw instanceof Uint8Array
                ? hexPreview(loginRaw, 24)
                : "",
          });
        }
        const loginCode = String(loginRes.code ?? "");
        if (!isGatewaySuccessCode(loginCode)) {
          if (
            sessionTokenRef.current &&
            isGatewaySessionInvalidCode(loginRes.code)
          ) {
            logout();
            return;
          }
          console.warn("[gateway-ws] SERVER_LOGIN non-success", {
            code: loginRes.code,
            errMessage: loginRes.errMessage,
          });
        }
      } catch (e) {
        console.warn("[gateway-ws] SERVER_LOGIN failed", e);
      }

      try {
        await request({
          type: GATEWAY_API_GET_JACKPOT_INFO,
          data: new Uint8Array(0),
          debugLabel: "GET_JACKPOT_INFO",
        });
      } catch (e) {
        console.warn("[gateway-ws] GET_JACKPOT_INFO failed", e);
      }
    },
    onSocketError: (ev) => {
      console.warn("[gateway-ws] WebSocket error:", ev);
      // #region agent log
      fetch("http://127.0.0.1:7694/ingest/2a6ad6f6-2323-4c1b-9e95-f3066b39fbee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "b5f9ce",
        },
        body: JSON.stringify({
          sessionId: "b5f9ce",
          location: "GatewayLobbyProvider.tsx:onSocketError",
          message: "lobby_shows_ws_error_banner",
          data: {
            hypothesisId: "E",
            navigatorOnLine:
              typeof navigator !== "undefined" ? navigator.onLine : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (gateActive) {
        setLobbyWsBootstrapDone(true);
      }
      if (wsLobbyEnabled) {
        setLobbyLoading(false);
        setLobbyError((prev) => prev ?? "WebSocket connection error");
      } else {
        setLobbyGames(null);
        setLobbyGet(null);
      }
    },
    onGatewayError: (msg) => {
      if (import.meta.env.DEV) {
        console.warn("[gateway-ws][dev] non-success code:", msg);
      }
      const codeStr = String(msg.code ?? "");
      if (sessionTokenRef.current && isGatewaySessionInvalidCode(codeStr)) {
        logout();
      }
    },
  });

  const needsLobbyHydrationOverlay = gateActive && !lobbyWsBootstrapDone;

  const value = useMemo<GatewayLobbyContextValue>(
    () => ({
      requestRef,
      gatewayRequestReady,
      lobbyGames,
      lobbyLoading,
      lobbyError,
      liveJackpotAmounts,
      lobbyGet,
      refreshLobbyGet,
      subscribePaymentFinish,
      subscribeWithdrawSuccessPush,
      needsLobbyHydrationOverlay,
    }),
    [
      gatewayRequestReady,
      lobbyGames,
      lobbyLoading,
      lobbyError,
      liveJackpotAmounts,
      lobbyGet,
      refreshLobbyGet,
      subscribePaymentFinish,
      subscribeWithdrawSuccessPush,
      needsLobbyHydrationOverlay,
    ],
  );

  return (
    <GatewayLobbyContext.Provider value={value}>
      {children}
      <LobbyHydrationGate />
    </GatewayLobbyContext.Provider>
  );
}
