/** Debug NDJSON ingest + local ring buffer (iPhone cannot reach 127.0.0.1 on dev machine). */
// #region agent log
const SESSION_ID = 'df0ef9'
const INGEST_URL =
  'http://127.0.0.1:7694/ingest/2a6ad6f6-2323-4c1b-9e95-f3066b39fbee'
const STORAGE_KEY = 'agent_debug_df0ef9'
const RING_MAX = 100

export type AgentDebugPayload = {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  runId?: string
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
  void fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_ID,
    },
    body: JSON.stringify(body),
  }).catch(() => {})
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
