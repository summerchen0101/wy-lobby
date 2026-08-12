const SESSION_EVICTION_CHANNEL = "ffgt:session-evicted";

export type SessionEvictionMessage = {
  type: "session-evicted";
  message: string;
  sourceTabId: string;
};

/** 主分頁收到 Gateway `USER_KICK_BEFORE` 時，通知同源其他分頁一併登出。 */
export function broadcastSessionEviction(
  message: string,
  sourceTabId: string,
): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(SESSION_EVICTION_CHANNEL);
    channel.postMessage({
      type: "session-evicted",
      message,
      sourceTabId,
    } satisfies SessionEvictionMessage);
    channel.close();
  } catch {
    /* ignore */
  }
}

export function startSessionEvictionListener(
  onEvicted: (payload: SessionEvictionMessage) => void,
): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const channel = new BroadcastChannel(SESSION_EVICTION_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as Partial<SessionEvictionMessage> | null;
    if (data?.type !== "session-evicted") return;
    if (typeof data.message !== "string" || !data.message.trim()) return;
    if (typeof data.sourceTabId !== "string" || !data.sourceTabId.trim()) return;
    onEvicted({
      type: "session-evicted",
      message: data.message,
      sourceTabId: data.sourceTabId,
    });
  };
  return () => channel.close();
}
