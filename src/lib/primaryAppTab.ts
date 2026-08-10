import { useEffect, useState } from "react";

const TAB_ID_KEY = "ffgt:tab-id";
const LEASE_KEY = "ffgt:primary-tab-lease";
const PRIMARY_TAB_CHANNEL = "ffgt:primary-tab";
const HEARTBEAT_MS = 2_000;
const LEASE_TTL_MS = 6_000;
const SECONDARY_TAB_CLOSE_BLOCKED_MS = 150;

type TabLease = { tabId: string; at: number };

function getOrCreateTabId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  let id = sessionStorage.getItem(TAB_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(TAB_ID_KEY, id);
  }
  return id;
}

function readLease(): TabLease | null {
  try {
    const raw = localStorage.getItem(LEASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabLease;
    if (!parsed?.tabId || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(tabId: string): void {
  try {
    localStorage.setItem(
      LEASE_KEY,
      JSON.stringify({ tabId, at: Date.now() } satisfies TabLease),
    );
  } catch {
    /* ignore */
  }
}

function releaseLease(tabId: string): void {
  try {
    const lease = readLease();
    if (lease?.tabId === tabId) {
      localStorage.removeItem(LEASE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * 主分頁寫入 lease。嚴格單分頁：若其他分頁仍持有有效 lease 則不搶佔（聚焦也不接管）。
 */
export function claimPrimaryTabLeaseIfVisible(): void {
  if (typeof document === "undefined") return;
  if (document.visibilityState !== "visible") return;
  const mine = getOrCreateTabId();
  const lease = readLease();
  if (
    lease &&
    lease.tabId !== mine &&
    Date.now() - lease.at < LEASE_TTL_MS
  ) {
    return;
  }
  writeLease(mine);
}

/** 請主分頁聚焦（BroadcastChannel；手動新開分頁無 window.opener 時仍可用）。 */
export function requestPrimaryTabFocus(): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(PRIMARY_TAB_CHANNEL);
    channel.postMessage({ type: "focus" });
    channel.close();
  } catch {
    /* ignore */
  }
}

export function startPrimaryTabFocusListener(): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const channel = new BroadcastChannel(PRIMARY_TAB_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "focus") {
      window.focus();
    }
  };
  return () => channel.close();
}

/**
 * 次分頁關閉：先聚焦主分頁再 window.close()。
 * 手動新開分頁貼網址時瀏覽器常拒絕 close；onCloseBlocked 供 UI 改顯示手動關閉指引。
 */
export function tryDismissSecondaryTab(onCloseBlocked?: () => void): void {
  if (typeof window === "undefined") return;
  requestPrimaryTabFocus();
  try {
    window.opener?.focus();
  } catch {
    /* ignore */
  }
  window.close();
  if (onCloseBlocked) {
    window.setTimeout(onCloseBlocked, SECONDARY_TAB_CLOSE_BLOCKED_MS);
  }
}

/** 是否為另開的分頁（已有其他分頁持有主分頁 lease）。 */
export function isSecondaryAppTab(): boolean {
  if (typeof sessionStorage === "undefined" || typeof localStorage === "undefined") {
    return false;
  }
  const mine = getOrCreateTabId();
  const lease = readLease();
  if (!lease) return false;
  if (lease.tabId === mine) return false;
  return Date.now() - lease.at < LEASE_TTL_MS;
}

function startPrimaryLeaseHeartbeat(tabId: string): () => void {
  const tick = () => {
    const lease = readLease();
    if (
      !lease ||
      lease.tabId === tabId ||
      Date.now() - lease.at >= LEASE_TTL_MS
    ) {
      writeLease(tabId);
    }
  };

  tick();
  const intervalId = window.setInterval(tick, HEARTBEAT_MS);
  const onUnload = () => releaseLease(tabId);
  window.addEventListener("beforeunload", onUnload);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("beforeunload", onUnload);
    onUnload();
  };
}

/**
 * 主分頁：負責 Gateway WS 與每日登入自動彈窗。
 * 次分頁回傳 false；嚴格單分頁下聚焦不會搶佔 lease，須關閉主分頁後次分頁才可接管。
 */
export function usePrimaryAppTab(): boolean {
  const [isPrimary, setIsPrimary] = useState(() => !isSecondaryAppTab());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setIsPrimary(!isSecondaryAppTab());
    const onFocusOrVisible = () => {
      claimPrimaryTabLeaseIfVisible();
      sync();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    const pollId = window.setInterval(sync, HEARTBEAT_MS);
    onFocusOrVisible();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isPrimary) return;
    const stopFocusListener = startPrimaryTabFocusListener();
    const stopHeartbeat = startPrimaryLeaseHeartbeat(getOrCreateTabId());
    return () => {
      stopFocusListener();
      stopHeartbeat();
    };
  }, [isPrimary]);

  return isPrimary;
}
