import { useEffect, useRef } from 'react'
import {
  createGatewayWs,
  type GatewayWsOptions,
} from './gatewayWs'

export type UseGatewayWsParams = GatewayWsOptions & {
  /** false 時不連線（預設 false，避免干擾未就緒後端） */
  enabled?: boolean
}

/**
 * 以 ref 保留最新 callback，避免 effect 過度重跑。
 * `enabled === true` 時建立連線並在 unmount 時關閉。
 */
export function useGatewayWs(params: UseGatewayWsParams): void {
  const {
    enabled = false,
    onState,
    onResponse,
    onOpen,
    onSocketError,
    onGatewayError,
    getRequestBasicExtras,
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
  } = params

  const onStateRef = useRef(onState)
  const onResponseRef = useRef(onResponse)
  const onOpenRef = useRef(onOpen)
  const onSocketErrorRef = useRef(onSocketError)
  const onGatewayErrorRef = useRef(onGatewayError)
  const getExtrasRef = useRef(getRequestBasicExtras)

  useEffect(() => {
    onStateRef.current = onState
    onResponseRef.current = onResponse
    onOpenRef.current = onOpen
    onSocketErrorRef.current = onSocketError
    onGatewayErrorRef.current = onGatewayError
    getExtrasRef.current = getRequestBasicExtras
  }, [
    onState,
    onResponse,
    onOpen,
    onSocketError,
    onGatewayError,
    getRequestBasicExtras,
  ])

  useEffect(() => {
    if (!enabled) return

    /** 延後到下一個 macrotask，讓 Strict Mode「掛載 → 同步 cleanup → 再掛載」可先 clearTimeout，避免短命期開兩條同 token 連線而被 Gateway 判 DuplicateConn（後登入端誤彈踢人提示）。 */
    let client: ReturnType<typeof createGatewayWs> | null = null
    const openTicket = setTimeout(() => {
      client = createGatewayWs({
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
        getRequestBasicExtras: () =>
          (getExtrasRef.current?.() ?? {}) as Record<string, unknown>,
        onState: (s, m) => onStateRef.current?.(s, m),
        onResponse: (m) => onResponseRef.current?.(m),
        onOpen: (ctx) => onOpenRef.current?.(ctx),
        onSocketError: (e) => onSocketErrorRef.current?.(e),
        onGatewayError: (m) => onGatewayErrorRef.current?.(m),
      })

      client.open()
    }, 0)

    return () => {
      clearTimeout(openTicket)
      client?.close()
    }
  }, [
    enabled,
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
  ])
}
