/** Debug NDJSON ingest + local ring buffer (iPhone cannot reach 127.0.0.1 on dev machine). */
// #region agent log
const SESSION_ID = 'df0ef9'
const STORAGE_KEY = 'agent_debug_df0ef9'
const RING_MAX = 100

function ingestUrl(): string | undefined {
  const raw = import.meta.env.VITE_AGENT_DEBUG_INGEST_URL?.trim()
  return raw || undefined
}

export type AgentDebugPayload = {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  runId?: string
}

/** POST JSON only when `VITE_AGENT_DEBUG_INGEST_URL` is set (avoids stray localhost fetch noise). */
export function agentDebugPostJson(body: Record<string, unknown>): void {
  const url = ingestUrl()
  if (!url) return
  const sid =
    typeof body.sessionId === 'string' && body.sessionId
      ? body.sessionId
      : 'unknown'
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': sid,
    },
    body: JSON.stringify(body),
  }).catch(() => {})
}

/** Strip token from URLs before logging. */
export function agentDebugUrlPreview(raw: string): string {
  try {
    const u = new URL(raw, 'https://invalid.local/')
    u.searchParams.delete('token')
    return u.pathname + u.search + u.hash
  } catch {
    return '(unparsed)'
  }
}

export function agentDebugLog(p: AgentDebugPayload): void {
  const body = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    ...p,
  }
  agentDebugPostJson(body)
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as unknown
    const arr = Array.isArray(prev) ? prev : []
    const next = [...arr.slice(-(RING_MAX - 1)), body]
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
// #endregion
