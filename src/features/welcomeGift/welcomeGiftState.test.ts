import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWelcomeGiftClaimedForTests,
  markWelcomeGiftClaimed,
  wasWelcomeGiftClaimed,
} from "./welcomeGiftState";

describe("welcomeGiftState", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    clearWelcomeGiftClaimedForTests();
    vi.unstubAllGlobals();
  });

  it("tracks claimed state per user in sessionStorage", () => {
    expect(wasWelcomeGiftClaimed("42")).toBe(false);
    markWelcomeGiftClaimed("42");
    expect(wasWelcomeGiftClaimed("42")).toBe(true);
    expect(wasWelcomeGiftClaimed("99")).toBe(false);
  });

  it("ignores empty user ids", () => {
    markWelcomeGiftClaimed("");
    markWelcomeGiftClaimed("0");
    expect(wasWelcomeGiftClaimed("")).toBe(false);
    expect(wasWelcomeGiftClaimed("0")).toBe(false);
  });
});
