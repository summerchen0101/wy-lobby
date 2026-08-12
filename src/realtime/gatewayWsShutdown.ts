/** 與 `GatewayWsStateMeta.shutdownReason` 一致 */
export type GatewayWsShutdownReason =
  | 'client_close'
  | 'transport'
  | 'reconnect_exhausted'
  | 'auth_rejected'

export type ResolveGatewayWsShutdownInput = {
  closedByUser: boolean
  hasOpenedOnce: boolean
  closeCode: number
  closeReason: string
  fatalReconnectCloseCodes: ReadonlySet<number>
  maxReconnectAttempts: number | undefined
  attempt: number
}

export type ResolveGatewayWsShutdownResult = {
  shutdownReason: GatewayWsShutdownReason
  handshakeNeverSucceeded: boolean
  shouldReconnect: boolean
}

const AUTH_CLOSE_REASON_RE = /401|401001|unauthorized/i

export function closeReasonIndicatesAuthFailure(reason: string): boolean {
  return AUTH_CLOSE_REASON_RE.test(reason.trim())
}

export function resolveGatewayWsShutdown(
  input: ResolveGatewayWsShutdownInput,
): ResolveGatewayWsShutdownResult {
  const {
    closedByUser,
    hasOpenedOnce,
    closeCode,
    closeReason,
    fatalReconnectCloseCodes,
    maxReconnectAttempts,
    attempt,
  } = input

  const handshakeNeverSucceeded = !hasOpenedOnce

  if (closedByUser) {
    return {
      shutdownReason: 'client_close',
      handshakeNeverSucceeded,
      shouldReconnect: false,
    }
  }

  if (
    fatalReconnectCloseCodes.has(closeCode) ||
    closeReasonIndicatesAuthFailure(closeReason)
  ) {
    return {
      shutdownReason: 'auth_rejected',
      handshakeNeverSucceeded,
      shouldReconnect: false,
    }
  }

  if (!hasOpenedOnce) {
    return {
      shutdownReason: 'auth_rejected',
      handshakeNeverSucceeded: true,
      shouldReconnect: false,
    }
  }

  if (maxReconnectAttempts != null && attempt >= maxReconnectAttempts) {
    return {
      shutdownReason: 'reconnect_exhausted',
      handshakeNeverSucceeded,
      shouldReconnect: false,
    }
  }

  return {
    shutdownReason: 'transport',
    handshakeNeverSucceeded,
    shouldReconnect: true,
  }
}

/** 已開過線後非主動關閉：大廳應 cover，且不可再開遊戲。 */
export function isGatewayWsDisconnectCoverReason(
  reason: GatewayWsShutdownReason | undefined,
  handshakeNeverSucceeded?: boolean,
): boolean {
  if (reason === 'transport') return true
  if (reason === 'reconnect_exhausted' && !handshakeNeverSucceeded) return true
  return false
}
