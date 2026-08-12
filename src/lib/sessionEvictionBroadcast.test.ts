import { afterEach, describe, expect, it, vi } from "vitest";
import {
  broadcastSessionEviction,
  startSessionEvictionListener,
} from "./sessionEvictionBroadcast";

describe("sessionEvictionBroadcast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts session eviction to other tabs", () => {
    const posted: unknown[] = [];
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        postMessage(data: unknown) {
          posted.push(data);
        }
        close() {}
      },
    );

    broadcastSessionEviction("Account repeated login", "tab-a");

    expect(posted).toEqual([
      {
        type: "session-evicted",
        message: "Account repeated login",
        sourceTabId: "tab-a",
      },
    ]);
  });

  it("invokes listener for valid eviction payloads", () => {
    const handlers: Array<(event: MessageEvent) => void> = [];
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        set onmessage(fn: (event: MessageEvent) => void) {
          handlers.push(fn);
        }
        close() {}
      },
    );

    const onEvicted = vi.fn();
    startSessionEvictionListener(onEvicted);

    handlers[0]?.({
      data: {
        type: "session-evicted",
        message: "Account repeated login",
        sourceTabId: "tab-a",
      },
    } as MessageEvent);

    expect(onEvicted).toHaveBeenCalledWith({
      type: "session-evicted",
      message: "Account repeated login",
      sourceTabId: "tab-a",
    });
  });
});
