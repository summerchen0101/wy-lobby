import {
  decodeGatewayResponse,
  encodeGatewayRequest,
  gatewayResponseToObject,
  isGatewaySuccessCode,
} from "./gatewayWire";
import { formatGatewayResponseForDevLog } from "./gatewayResponseDevPayload";
import {
  isGatewayWsTraceEnabled,
  logGatewayRequestOut,
} from "./gatewayWsTrace";
import { getGatewayWsUrl, isDevConsoleEnabled } from "../lib/env";
import { agentDebugPostJson } from "../debug/agentDebugIngest";
import { resolveGatewayWsShutdown } from "./gatewayWsShutdown";

export type GatewayWsConnectionState =
  | "idle"
  | "connecting"
  | "open"
  | "closed";

/** 僅在 `state === 'closed'` 時有意義；區分主動關閉與傳輸層斷線（供上層忽略 stale `closed`）。 */
export type GatewayWsStateMeta = {
  shutdownReason?:
    | "client_close"
    | "transport"
    | "reconnect_exhausted"
    | "auth_rejected";
  /** `closed` 時：本 client 生命週期內從未成功 `open`（常為握手 token 失效） */
  handshakeNeverSucceeded?: boolean;
  closeCode?: number;
  closeReason?: string;
  wasClean?: boolean;
};

export type GatewayWsResponseObject = ReturnType<
  typeof gatewayResponseToObject
>;

export type GatewayWsRequestPayload = {
  type: number;
  data?: Uint8Array;
  /** 併入該次 Request 的 RequestBasic（會蓋過同鍵的 getRequestBasicExtras） */
  basicExtras?: Record<string, unknown>;
  /**
   * 僅診斷用：`isDevConsoleEnabled()` 時經 WS trace／dev log 辨識用途（如 `LOBBY_GET`）；production 預設不輸出。
   */
  debugLabel?: string;
};

export type GatewayWsRequestFn = (
  req: GatewayWsRequestPayload,
) => Promise<GatewayWsResponseObject>;

export type GatewayWsOptions = {
  /** 若設定則完全覆寫連線 URL（含 query）；除錯用 */
  url?: string;
  /**
   * 併入連線 URL 的 query `token`（試玩可空字串）。
   * 未設定時沿用 `getGatewayWsUrl()` 規則（可保留 `VITE_WS_URL` 內既有 token）。
   */
  wsToken?: string | null;
  /** 寫入 RequestBasic.clientVer；預設 web-alpha */
  clientVer?: string;
  /** `request()` 逾時毫秒；預設 15000；<=0 則不設逾時 */
  requestTimeoutMs?: number;
  /** 預設 25s；<=0 則不送 PING_PONG */
  heartbeatIntervalMs?: number;
  /** 斷線後自動重連；預設 true */
  reconnect?: boolean;
  /**
   * 未成功 `open` 前，累計 `onclose` 後最多再排程幾次重連（不含第一次 `connectNow`）。
   * 未設定時不限制（維持舊行為）。
   */
  maxReconnectAttempts?: number;
  /** 僅握手／傳輸層：此類 WebSocket `CloseEvent.code` 視為不可重連（如後端以自訂 code 拒絕 token） */
  fatalReconnectCloseCodes?: readonly number[];
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  /**
   * 自送出 WebSocket 連線後，若超過此毫秒仍未 `open` 則 `close()` 觸發 `onclose`（可銜接重試）。
   * <=0 或未設定時不啟用（避免變更舊行為）；建議 10_000–20_000。
   */
  handshakeTimeoutMs?: number;
  /** 併入每則 Request 的 RequestBasic（如 token、userID）；`request()` 會再帶 timestamp、requestID */
  getRequestBasicExtras?: () => Record<string, unknown>;
  onState?: (s: GatewayWsConnectionState, meta?: GatewayWsStateMeta) => void;
  onResponse?: (msg: GatewayWsResponseObject) => void;
  /** 連線成功（open）後呼叫；可在此發 LOBBY_GET 等；心跳在 `onOpen` 之前已啟動 */
  onOpen?: (ctx: { request: GatewayWsRequestFn }) => void | Promise<void>;
  /** WebSocket 層錯誤 */
  onSocketError?: (ev: Event) => void;
  /** 業務 code 非 200/204 時觸發（仍會先呼叫 onResponse） */
  onGatewayError?: (msg: GatewayWsResponseObject) => void;
  /**
   * 若為 true，`open` 時不送首包 `PING_PONG`（仍遵守 `heartbeatIntervalMs` 之後續心跳）。
   * 用於臨時連線只發單一業務請求、避免兩筆 `pending` 與後端亂序回包。
   */
  skipInitialPing?: boolean;
  /**
   * 若為 true：當回應之 `basic.requestID` 與任一 `pending` 不符，但 `code` 為成功且僅剩一筆 `pending` 時，
   * 仍將該則回應配給那筆請求（因部分後端不會回寫與 Request 相同之 requestID）。
   */
  pairUnmatchedSuccessToSinglePending?: boolean;
  /**
   * 若為 true：`request()` 排隊執行，同一時間僅一筆 pending（大廳 bootstrap／輪詢適用）。
   */
  serializeRequests?: boolean;
};

const PING_PONG = 0;

type PendingEntry = {
  resolve: (v: GatewayWsResponseObject) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
  apiType: number;
  /** 僅 DEV；與 `GatewayWsRequestPayload.debugLabel` 相同 */
  debugLabel?: string;
};

/** 供上層判斷是否為 `request()` 逾時（含自動重試邏輯）。 */
export function isGatewayWsRequestTimeoutError(e: unknown): boolean {
  return (
    e instanceof Error && e.message.includes("[gateway-ws] request timeout")
  );
}

/** WebSocket `send` 在 DOM 型別上要求 `ArrayBuffer`，避免 `Uint8Array<ArrayBufferLike>` 不相容。 */
function asWsBinaryPayload(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

function randomRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 與 `pending` 的 key（UUID 字串）比對用；避免 Long／number 邊角 */
function normalizeResponseRequestId(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "bigint") return raw.toString();
  return String(raw).trim();
}

/** `toObject`／執行期可能為 `requestID` 或 `requestId`，需與送出之 `RequestBasic.requestID` 對齊 */
function extractBasicRequestId(basic: unknown): string {
  if (!basic || typeof basic !== "object") return "";
  const o = basic as Record<string, unknown>;
  return normalizeResponseRequestId(o.requestID ?? o.requestId);
}

export function createGatewayWs(options: GatewayWsOptions = {}) {
  let ws: WebSocket | null = null;
  let state: GatewayWsConnectionState = "idle";
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatVisibilityListener: (() => void) | null = null;
  let lastPingAtMs = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let handshakeWatchTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByUser = false;
  let attempt = 0;
  /** 本 client 生命週期內是否曾成功 `open`（重連後仍為 true） */
  let hasOpenedOnce = false;
  const pending = new Map<string, PendingEntry>();
  let requestSerialChain: Promise<unknown> = Promise.resolve();

  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 25_000;
  const reconnect = options.reconnect !== false;
  const initialDelay = options.initialReconnectDelayMs ?? 1_000;
  const maxDelay = options.maxReconnectDelayMs ?? 30_000;
  const requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  const defaultClientVer = options.clientVer?.trim() || "web-alpha";
  const skipInitialPing = options.skipInitialPing === true;
  const pairUnmatchedSuccessToSinglePending =
    options.pairUnmatchedSuccessToSinglePending === true;
  const serializeRequests = options.serializeRequests === true;
  const fatalReconnectCodes = options.fatalReconnectCloseCodes ?? [];
  const fatalReconnectSet = new Set(fatalReconnectCodes);
  const maxReconnectAttempts = options.maxReconnectAttempts;
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? 0;

  function clearHandshakeWatch() {
    if (handshakeWatchTimer !== null) {
      clearTimeout(handshakeWatchTimer);
      handshakeWatchTimer = null;
    }
  }

  function rejectAllPending(reason: Error) {
    for (const [, entry] of pending) {
      if (entry.timer !== null) clearTimeout(entry.timer);
      entry.reject(reason);
    }
    pending.clear();
    requestSerialChain = Promise.resolve();
  }

  function findUniquePendingByApiType(
    responseType: number,
  ): [string, PendingEntry] | null {
    let found: [string, PendingEntry] | null = null;
    for (const [id, entry] of pending) {
      if (entry.apiType !== responseType) continue;
      if (found) return null;
      found = [id, entry];
    }
    return found;
  }

  function setState(next: GatewayWsConnectionState, meta?: GatewayWsStateMeta) {
    state = next;
    options.onState?.(next, meta);
  }

  function clearHeartbeatVisibilityListener() {
    if (
      heartbeatVisibilityListener !== null &&
      typeof document !== "undefined"
    ) {
      document.removeEventListener(
        "visibilitychange",
        heartbeatVisibilityListener,
      );
      heartbeatVisibilityListener = null;
    }
  }

  function clearHeartbeat() {
    if (heartbeatTimer !== null) {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
    clearHeartbeatVisibilityListener();
    lastPingAtMs = 0;
  }

  function clearReconnect() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function closeConnectingSocketIfStale(socket: WebSocket) {
    if (ws === socket && socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }

  function buildPingRequest(): {
    payload: Uint8Array;
    requestID: string;
    basicPlain: Record<string, unknown>;
  } {
    const extras = options.getRequestBasicExtras?.() ?? {};
    const tokenBasic =
      options.wsToken !== undefined
        ? (options.wsToken ?? "")
        : String((extras as { token?: string }).token ?? "");
    const requestID = randomRequestId();
    const basicPlain: Record<string, unknown> = {
      ...extras,
      clientVer:
        (extras as { clientVer?: string }).clientVer ?? defaultClientVer,
      token: tokenBasic,
      timestamp: Date.now(),
      requestID,
    };
    const payload = encodeGatewayRequest({
      basic: basicPlain,
      type: PING_PONG,
      data: new Uint8Array(0),
    });
    return { payload, requestID, basicPlain };
  }

  function sendPing() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const { payload, requestID, basicPlain } = buildPingRequest();
      logGatewayRequestOut({
        kind: "PING_PONG",
        apiType: PING_PONG,
        requestID,
        basic: basicPlain,
        data: new Uint8Array(0),
      });
      ws.send(asWsBinaryPayload(payload));
      lastPingAtMs = Date.now();
    } catch (e) {
      console.warn("[gateway-ws] ping send failed", e);
    }
  }

  function sendPingIfOverdue() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (lastPingAtMs === 0 || now - lastPingAtMs >= heartbeatIntervalMs) {
      sendPing();
    }
  }

  function onHeartbeatVisibilityChange() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      sendPing();
      return;
    }
    if (document.visibilityState === "visible") {
      sendPingIfOverdue();
    }
  }

  function startHeartbeat() {
    clearHeartbeat();
    if (heartbeatIntervalMs <= 0) return;

    const tickMs = Math.min(heartbeatIntervalMs, 1_000);

    const scheduleHeartbeatTick = () => {
      heartbeatTimer = setTimeout(() => {
        heartbeatTimer = null;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        sendPingIfOverdue();
        scheduleHeartbeatTick();
      }, tickMs);
    };

    if (typeof document !== "undefined") {
      heartbeatVisibilityListener = onHeartbeatVisibilityChange;
      document.addEventListener(
        "visibilitychange",
        heartbeatVisibilityListener,
      );
    }

    scheduleHeartbeatTick();
  }

  function handleIncomingArrayBuffer(data: ArrayBuffer) {
    let obj: GatewayWsResponseObject;
    try {
      const buf = new Uint8Array(data);
      const decoded = decodeGatewayResponse(buf);
      obj = gatewayResponseToObject(decoded);
    } catch (e) {
      if (isGatewayWsTraceEnabled()) {
        console.warn(
          "[gateway-ws] failed to decode binary as gateway.Response",
          e,
        );
      }
      return;
    }
    if (isGatewayWsTraceEnabled()) {
      console.info(
        "[gateway-ws] ← response",
        formatGatewayResponseForDevLog(obj),
      );
    }
    const rid = extractBasicRequestId((obj as { basic?: unknown }).basic);
    const codeStr = String(obj.code ?? "");
    const success = isGatewaySuccessCode(codeStr);

    function completeEntry(requestKey: string, entry: PendingEntry) {
      pending.delete(requestKey);
      if (entry.timer !== null) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      entry.resolve(obj);
    }

    if (rid && pending.has(rid)) {
      const entry = pending.get(rid)!;
      completeEntry(rid, entry);
    } else if (success) {
      const responseType = Number(obj.type);
      const byType =
        Number.isFinite(responseType) && responseType >= 0
          ? findUniquePendingByApiType(responseType)
          : null;
      if (byType) {
        if (isGatewayWsTraceEnabled()) {
          console.warn(
            "[gateway-ws] paired response by api type (requestID mismatch)",
            {
              responseRequestId: rid || "(empty)",
              apiType: responseType,
              pendingKey: byType[0],
              debugLabel: byType[1].debugLabel,
            },
          );
        }
        completeEntry(byType[0], byType[1]);
      } else if (pairUnmatchedSuccessToSinglePending && pending.size === 1) {
        const [onlyId, entry] = pending.entries().next().value!;
        completeEntry(onlyId, entry);
      } else if (isGatewayWsTraceEnabled() && pending.size > 0) {
        const pendingSample =
          pending.size <= 3
            ? [...pending.keys()].join(", ")
            : `${pending.size} keys`;
        console.warn(
          "[gateway-ws] response did not match any pending request",
          {
            responseRequestId: rid || "(empty)",
            pendingKeysSample: pendingSample,
            type: obj.type,
            code: codeStr,
            errMessage: (obj as { errMessage?: string }).errMessage,
          },
        );
      }
    } else if (isGatewayWsTraceEnabled() && pending.size > 0) {
      const pendingSample =
        pending.size <= 3
          ? [...pending.keys()].join(", ")
          : `${pending.size} keys`;
      console.warn("[gateway-ws] response did not match any pending request", {
        responseRequestId: rid || "(empty)",
        pendingKeysSample: pendingSample,
        type: obj.type,
        code: codeStr,
        errMessage: (obj as { errMessage?: string }).errMessage,
      });
    }
    options.onResponse?.(obj);
    if (codeStr && !isGatewaySuccessCode(codeStr)) {
      options.onGatewayError?.(obj);
    }
  }

  function resolveConnectUrl(): string {
    const explicit = options.url?.trim();
    if (explicit) return explicit;
    if (options.wsToken !== undefined) {
      return getGatewayWsUrl({ token: options.wsToken ?? "" });
    }
    return getGatewayWsUrl();
  }

  function performRequest(
    req: GatewayWsRequestPayload,
  ): Promise<GatewayWsResponseObject> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("[gateway-ws] socket not open"));
    }
    const requestID = randomRequestId();
    const extras = {
      ...(options.getRequestBasicExtras?.() ?? {}),
      ...(req.basicExtras ?? {}),
    };
    const tokenBasic =
      options.wsToken !== undefined
        ? (options.wsToken ?? "")
        : String((extras as { token?: string }).token ?? "");
    const basicPlain: Record<string, unknown> = {
      ...extras,
      clientVer:
        (extras as { clientVer?: string }).clientVer ?? defaultClientVer,
      token: tokenBasic,
      timestamp: Date.now(),
      requestID,
    };
    const payload = encodeGatewayRequest({
      basic: basicPlain,
      type: req.type,
      data: req.data ?? new Uint8Array(0),
    });

    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      if (requestTimeoutMs > 0) {
        timer = setTimeout(() => {
          const ent = pending.get(requestID);
          if (isGatewayWsTraceEnabled()) {
            console.warn("[gateway-ws] request timeout", {
              debugLabel: ent?.debugLabel,
              requestID,
            });
          }
          pending.delete(requestID);
          reject(new Error(`[gateway-ws] request timeout: ${requestID}`));
        }, requestTimeoutMs);
      }
      const dataForLen = req.data ?? new Uint8Array(0);
      pending.set(requestID, {
        resolve,
        reject,
        timer,
        apiType: req.type,
        debugLabel: req.debugLabel,
      });
      try {
        logGatewayRequestOut({
          apiType: req.type,
          requestID,
          debugLabel: req.debugLabel,
          basic: basicPlain,
          data: dataForLen,
        });
        ws!.send(asWsBinaryPayload(payload));
      } catch (e) {
        pending.delete(requestID);
        if (timer !== null) clearTimeout(timer);
        reject(e instanceof Error ? e : new Error("[gateway-ws] send failed"));
      }
    });
  }

  function request(
    req: GatewayWsRequestPayload,
  ): Promise<GatewayWsResponseObject> {
    if (!serializeRequests) {
      return performRequest(req);
    }
    const run = () => performRequest(req);
    const chained = requestSerialChain.then(run, run);
    requestSerialChain = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }

  function connectNow() {
    const url = resolveConnectUrl();
    closedByUser = false;
    clearReconnect();
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // #region agent log
    (() => {
      try {
        const u = new URL(url);
        agentDebugPostJson({
          sessionId: "b5f9ce",
          location: "gatewayWs.ts:connectNow",
          message: "ws_connect_attempt",
          data: {
            hypothesisId: "B",
            attempt,
            handshakeTimeoutMs,
            reconnect,
            wsProto: u.protocol,
            wsOrigin: u.origin,
            pathname: u.pathname,
            tokenLen: (u.searchParams.get("token") ?? "").length,
          },
          timestamp: Date.now(),
        });
      } catch {
        /* ignore invalid url shape for log */
      }
    })();
    // #endregion

    setState("connecting");
    clearHandshakeWatch();
    const socket = new WebSocket(url);
    ws = socket;
    socket.binaryType = "arraybuffer";

    if (handshakeTimeoutMs > 0) {
      handshakeWatchTimer = setTimeout(() => {
        handshakeWatchTimer = null;
        // #region agent log
        agentDebugPostJson({
          sessionId: "b5f9ce",
          location: "gatewayWs.ts:handshakeTimeout",
          message: "ws_handshake_timeout_fire",
          data: {
            hypothesisId: "D",
            handshakeTimeoutMs,
            socketState: socket.readyState,
            sameSocket: ws === socket,
          },
          timestamp: Date.now(),
        });
        // #endregion
        closeConnectingSocketIfStale(socket);
      }, handshakeTimeoutMs);
    }

    socket.onopen = () => {
      if (ws !== socket) return;
      clearHandshakeWatch();
      hasOpenedOnce = true;
      attempt = 0;
      setState("open");
      // #region agent log
      agentDebugPostJson({
        sessionId: "b5f9ce",
        location: "gatewayWs.ts:onopen",
        message: "ws_open_ok",
        data: { hypothesisId: "A", attempt },
        timestamp: Date.now(),
      });
      // #endregion
      if (!skipInitialPing) {
        sendPing();
      }
      startHeartbeat();
      void (async () => {
        try {
          await options.onOpen?.({ request });
        } catch (e) {
          console.warn("[gateway-ws] onOpen handler failed", e);
        }
      })();
    };

    socket.onmessage = (ev) => {
      if (ws !== socket) return;
      const d = ev.data;
      if (d instanceof ArrayBuffer) {
        handleIncomingArrayBuffer(d);
        return;
      }
      if (typeof Blob !== "undefined" && d instanceof Blob) {
        void d.arrayBuffer().then(
          (ab) => {
            if (ws !== socket) return;
            handleIncomingArrayBuffer(ab);
          },
          (e) => {
            if (isDevConsoleEnabled()) {
              console.warn("[gateway-ws] Blob.arrayBuffer() failed", e);
            }
          },
        );
        return;
      }
      if (typeof d === "string") {
        if (isDevConsoleEnabled()) {
          console.warn(
            "[gateway-ws] text WebSocket frame (ignored; expected binary gateway.Response)",
            d.length > 200 ? `${d.slice(0, 200)}…` : d,
          );
        }
      }
    };

    socket.onerror = (ev) => {
      if (ws !== socket) return;
      // #region agent log
      agentDebugPostJson({
        sessionId: "b5f9ce",
        location: "gatewayWs.ts:onerror",
        message: "ws_socket_error",
        data: {
          hypothesisId: "A",
          readyStateAtError: socket.readyState,
        },
        timestamp: Date.now(),
      });
      // #endregion
      options.onSocketError?.(ev);
    };

    socket.onclose = (ev: CloseEvent) => {
      if (ws !== socket) return;
      // #region agent log
      agentDebugPostJson({
        sessionId: "b5f9ce",
        location: "gatewayWs.ts:onclose",
        message: "ws_close",
        data: {
          hypothesisId: "C",
          code: ev.code,
          reason: String(ev.reason ?? "").slice(0, 200),
          wasClean: ev.wasClean,
        },
        timestamp: Date.now(),
      });
      // #endregion
      clearHandshakeWatch();
      clearHeartbeat();
      rejectAllPending(new Error("[gateway-ws] socket closed"));

      const closeReasonStr = String(ev.reason ?? "");
      const resolved = resolveGatewayWsShutdown({
        closedByUser,
        hasOpenedOnce,
        closeCode: ev.code,
        closeReason: closeReasonStr,
        fatalReconnectCloseCodes: fatalReconnectSet,
        maxReconnectAttempts,
        attempt,
      });

      setState("closed", {
        shutdownReason: resolved.shutdownReason,
        handshakeNeverSucceeded: resolved.handshakeNeverSucceeded,
        closeCode: ev.code,
        closeReason: closeReasonStr,
        wasClean: ev.wasClean,
      });
      ws = null;
      if (closedByUser || !reconnect || !resolved.shouldReconnect) return;
      const delay = Math.min(maxDelay, initialDelay * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        connectNow();
      }, delay);
    };
  }

  return {
    getState: () => state,

    open: () => {
      connectNow();
    },

    request,

    /** 送出自訂 Request（已由 encodeGatewayRequest 序列化之 bytes 可透過 gatewayWire 組裝） */
    sendRaw: (payload: Uint8Array) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("[gateway-ws] socket not open");
      }
      ws.send(asWsBinaryPayload(payload));
    },

    sendRequest: (fields: Parameters<typeof encodeGatewayRequest>[0]) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("[gateway-ws] socket not open");
      }
      ws.send(asWsBinaryPayload(encodeGatewayRequest(fields)));
    },

    close: () => {
      closedByUser = true;
      clearHandshakeWatch();
      clearHeartbeat();
      clearReconnect();
      rejectAllPending(new Error("[gateway-ws] closed by client"));
      ws?.close();
      ws = null;
      setState("closed", { shutdownReason: "client_close" });
    },
  };
}

export type GatewayWsClient = ReturnType<typeof createGatewayWs>;
