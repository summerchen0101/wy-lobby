import { useEffect, useState } from "react";

const TAB_ID_KEY = "ffgt:tab-id";
const LEASE_KEY = "ffgt:primary-tab-lease";
const HEARTBEAT_MS = 2_000;
const LEASE_TTL_MS = 6_000;

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
    return startPrimaryLeaseHeartbeat(getOrCreateTabId());
  }, [isPrimary]);

  return isPrimary;
}
