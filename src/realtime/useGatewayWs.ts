import { useEffect, useRef } from 'react'
import { isDevConsoleEnabled } from '../lib/env'
import {
  createGatewayWs,
  type GatewayWsClient,
  type GatewayWsOptions,
} from './gatewayWs'

export type UseGatewayWsParams = GatewayWsOptions & {
  /** false 時不連線（預設 false，避免干擾未就緒後端） */
  enabled?: boolean
  /**
   * 訪客 vs 已登入；僅在此 boolean 切換時重建 WS。
   * access token 字串輪換（refresh）不應觸發重連。
   */
  wsAuthScope?: boolean
}

let activeGatewayWsClient: GatewayWsClient | null = null

/**
 * 以 ref 保留最新 callback，避免 effect 過度重跑。
 * `enabled === true` 時建立連線並在 unmount 時關閉。
 */
export function useGatewayWs(params: UseGatewayWsParams): void {
  const {
    enabled = false,
    wsAuthScope,
    onState,
    onResponse,
    onOpen,
    onSocketError,
    onGatewayError,
    getRequestBasicExtras,
    getWsToken,
    url,
    wsToken,
    clientVer,
    requestTimeoutMs,
    heartbeatIntervalMs,
    reconnect,
    maxReconnectAttempts,
    fatalReconnectCloseCodes,
    initialReconnectDelayMs,
    maxReconnectDelayMs,
    handshakeTimeoutMs,
    skipInitialPing,
    pairUnmatchedSuccessToSinglePending,
    serializeRequests,
  } = params

  /** Strict Mode 雙掛載：略延 open，讓 cleanup 先關閉短命連線 */
  const OPEN_DELAY_MS = 75

  const onStateRef = useRef(onState)
  const onResponseRef = useRef(onResponse)
  const onOpenRef = useRef(onOpen)
  const onSocketErrorRef = useRef(onSocketError)
  const onGatewayErrorRef = useRef(onGatewayError)
  const getExtrasRef = useRef(getRequestBasicExtras)
  const getWsTokenRef = useRef(getWsToken)
  const wsTokenRef = useRef(wsToken)

  const resolvedAuthScope =
    wsAuthScope ?? Boolean((wsToken ?? '').trim())

  useEffect(() => {
    onStateRef.current = onState
    onResponseRef.current = onResponse
    onOpenRef.current = onOpen
    onSocketErrorRef.current = onSocketError
    onGatewayErrorRef.current = onGatewayError
    getExtrasRef.current = getRequestBasicExtras
    getWsTokenRef.current = getWsToken
    wsTokenRef.current = wsToken
  }, [
    onState,
    onResponse,
    onOpen,
    onSocketError,
    onGatewayError,
    getRequestBasicExtras,
    getWsToken,
    wsToken,
  ])

  useEffect(() => {
    if (!enabled) return

    /** 延後到下一個 macrotask，讓 Strict Mode「掛載 → 同步 cleanup → 再掛載」可先 clearTimeout，避免短命期開兩條同 token 連線而被 Gateway 判 DuplicateConn（後登入端誤彈踢人提示）。 */
    let client: GatewayWsClient | null = null
    const openTicket = setTimeout(() => {
      if (activeGatewayWsClient) {
        activeGatewayWsClient.close()
        activeGatewayWsClient = null
      }
      client = createGatewayWs({
        url,
        clientVer,
        requestTimeoutMs,
        heartbeatIntervalMs,
        reconnect,
        maxReconnectAttempts,
        fatalReconnectCloseCodes,
        initialReconnectDelayMs,
        maxReconnectDelayMs,
        handshakeTimeoutMs,
        skipInitialPing,
        pairUnmatchedSuccessToSinglePending,
        serializeRequests,
        getWsToken: () => {
          const fromGetter = getWsTokenRef.current?.()
          if (fromGetter !== undefined) {
            return (fromGetter ?? '').trim()
          }
          return (wsTokenRef.current ?? '').trim()
        },
        getRequestBasicExtras: () =>
          (getExtrasRef.current?.() ?? {}) as Record<string, unknown>,
        onState: (s, m) => onStateRef.current?.(s, m),
        onResponse: (m) => onResponseRef.current?.(m),
        onOpen: (ctx) => onOpenRef.current?.(ctx),
        onSocketError: (e) => onSocketErrorRef.current?.(e),
        onGatewayError: (m) => onGatewayErrorRef.current?.(m),
      })

      activeGatewayWsClient = client
      client.open()
    }, OPEN_DELAY_MS)

    return () => {
      clearTimeout(openTicket)
      if (isDevConsoleEnabled()) {
        console.info('[gateway-ws][dev] closing ws client (auth_scope_change or unmount)')
      }
      client?.close()
      if (activeGatewayWsClient === client) {
        activeGatewayWsClient = null
      }
    }
  }, [
    enabled,
    resolvedAuthScope,
    url,
    clientVer,
    requestTimeoutMs,
    heartbeatIntervalMs,
    reconnect,
    maxReconnectAttempts,
    fatalReconnectCloseCodes,
    initialReconnectDelayMs,
    maxReconnectDelayMs,
    handshakeTimeoutMs,
    skipInitialPing,
    pairUnmatchedSuccessToSinglePending,
    serializeRequests,
  ])
}
