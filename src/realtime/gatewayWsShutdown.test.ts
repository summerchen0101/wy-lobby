import { describe, expect, it } from 'vitest'
import {
  closeReasonIndicatesAuthFailure,
  resolveGatewayWsShutdown,
} from './gatewayWsShutdown'

const emptyFatal = new Set<number>()

function base(overrides: Partial<Parameters<typeof resolveGatewayWsShutdown>[0]> = {}) {
  return {
    closedByUser: false,
    hasOpenedOnce: false,
    closeCode: 1006,
    closeReason: '',
    fatalReconnectCloseCodes: emptyFatal,
    maxReconnectAttempts: 6,
    attempt: 0,
    ...overrides,
  }
}

describe('closeReasonIndicatesAuthFailure', () => {
  it('matches 401, 401001, unauthorized', () => {
    expect(closeReasonIndicatesAuthFailure('401001')).toBe(true)
    expect(closeReasonIndicatesAuthFailure('[401001] unauthorized')).toBe(true)
    expect(closeReasonIndicatesAuthFailure('Unauthorized')).toBe(true)
    expect(closeReasonIndicatesAuthFailure('network error')).toBe(false)
  })
})

describe('resolveGatewayWsShutdown', () => {
  it('never opened + 1006 → auth_rejected, no reconnect', () => {
    const r = resolveGatewayWsShutdown(base())
    expect(r.shutdownReason).toBe('auth_rejected')
    expect(r.handshakeNeverSucceeded).toBe(true)
    expect(r.shouldReconnect).toBe(false)
  })

  it('opened once + 1006 → transport, reconnect', () => {
    const r = resolveGatewayWsShutdown(
      base({ hasOpenedOnce: true, attempt: 1 }),
    )
    expect(r.shutdownReason).toBe('transport')
    expect(r.handshakeNeverSucceeded).toBe(false)
    expect(r.shouldReconnect).toBe(true)
  })

  it('closeReason with 401001 → auth_rejected even if opened', () => {
    const r = resolveGatewayWsShutdown(
      base({
        hasOpenedOnce: true,
        closeReason: '401001 The request unauthorized.',
      }),
    )
    expect(r.shutdownReason).toBe('auth_rejected')
    expect(r.shouldReconnect).toBe(false)
  })

  it('fatal close code → auth_rejected', () => {
    const r = resolveGatewayWsShutdown(
      base({
        closeCode: 4401,
        fatalReconnectCloseCodes: new Set([4401]),
      }),
    )
    expect(r.shutdownReason).toBe('auth_rejected')
    expect(r.shouldReconnect).toBe(false)
  })

  it('reconnect exhausted after open → reconnect_exhausted', () => {
    const r = resolveGatewayWsShutdown(
      base({ hasOpenedOnce: true, attempt: 6, maxReconnectAttempts: 6 }),
    )
    expect(r.shutdownReason).toBe('reconnect_exhausted')
    expect(r.shouldReconnect).toBe(false)
  })

  it('closedByUser → client_close', () => {
    const r = resolveGatewayWsShutdown(base({ closedByUser: true }))
    expect(r.shutdownReason).toBe('client_close')
    expect(r.shouldReconnect).toBe(false)
  })
})
