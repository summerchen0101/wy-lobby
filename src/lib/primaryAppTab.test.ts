import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimPrimaryTabLeaseIfVisible,
  isSecondaryAppTab,
  requestPrimaryTabFocus,
  tryDismissSecondaryTab,
} from "./primaryAppTab";

function installStorageMocks(): void {
  const session = new Map<string, string>();
  const local = new Map<string, string>();

  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => {
      session.set(k, v);
    },
    removeItem: (k: string) => {
      session.delete(k);
    },
    clear: () => {
      session.clear();
    },
  });

  vi.stubGlobal("localStorage", {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => {
      local.set(k, v);
    },
    removeItem: (k: string) => {
      local.delete(k);
    },
    clear: () => {
      local.clear();
    },
  });
}

describe("primaryAppTab", () => {
  beforeEach(() => {
    installStorageMocks();
    sessionStorage.setItem("ffgt:tab-id", "tab-b");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats tab as secondary when another tab holds a fresh lease", () => {
    localStorage.setItem(
      "ffgt:primary-tab-lease",
      JSON.stringify({ tabId: "tab-a", at: Date.now() }),
    );
    expect(isSecondaryAppTab()).toBe(true);
  });

  it("treats tab as primary when lease is missing or stale", () => {
    expect(isSecondaryAppTab()).toBe(false);

    localStorage.setItem(
      "ffgt:primary-tab-lease",
      JSON.stringify({ tabId: "tab-a", at: Date.now() - 60_000 }),
    );
    expect(isSecondaryAppTab()).toBe(false);
  });

  it("treats tab as primary when it owns the lease", () => {
    localStorage.setItem(
      "ffgt:primary-tab-lease",
      JSON.stringify({ tabId: "tab-b", at: Date.now() }),
    );
    expect(isSecondaryAppTab()).toBe(false);
  });

  it("visible tab does not steal lease from another tab (strict single-tab)", () => {
    localStorage.setItem(
      "ffgt:primary-tab-lease",
      JSON.stringify({ tabId: "tab-a", at: Date.now() }),
    );
    expect(isSecondaryAppTab()).toBe(true);

    vi.stubGlobal("document", {
      visibilityState: "visible",
    });
    claimPrimaryTabLeaseIfVisible();

    expect(isSecondaryAppTab()).toBe(true);
    expect(JSON.parse(localStorage.getItem("ffgt:primary-tab-lease")!)).toEqual(
      expect.objectContaining({ tabId: "tab-a" }),
    );
  });

  it("does not claim lease while tab is hidden", () => {
    localStorage.setItem(
      "ffgt:primary-tab-lease",
      JSON.stringify({ tabId: "tab-a", at: Date.now() }),
    );

    vi.stubGlobal("document", {
      visibilityState: "hidden",
    });
    claimPrimaryTabLeaseIfVisible();

    expect(isSecondaryAppTab()).toBe(true);
  });

  it("requests primary focus and closes secondary tab", () => {
    const close = vi.fn();
    const postMessage = vi.fn();
    const channelClose = vi.fn();
    vi.stubGlobal("BroadcastChannel", class {
      postMessage = postMessage;
      close = channelClose;
    });
    vi.stubGlobal("window", {
      close,
      setTimeout: vi.fn(),
      opener: null,
    });

    tryDismissSecondaryTab();

    expect(postMessage).toHaveBeenCalledWith({ type: "focus" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("notifies when automatic close is blocked", () => {
    const onBlocked = vi.fn();
    const setTimeout = vi.fn((fn: () => void) => {
      fn();
      return 0;
    });
    vi.stubGlobal("BroadcastChannel", class {
      postMessage = vi.fn();
      close = vi.fn();
    });
    vi.stubGlobal("window", {
      close: vi.fn(),
      setTimeout,
      opener: null,
    });

    tryDismissSecondaryTab(onBlocked);

    expect(onBlocked).toHaveBeenCalledOnce();
  });

  it("posts focus message on requestPrimaryTabFocus", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("BroadcastChannel", class {
      postMessage = postMessage;
      close = vi.fn();
    });

    requestPrimaryTabFocus();

    expect(postMessage).toHaveBeenCalledWith({ type: "focus" });
  });
});
