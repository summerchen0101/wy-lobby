import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGameShellLobbyReturn,
  consumeGameShellLobbyReturn,
  peekGameShellLobbyReturn,
  writeGameShellLobbyReturn,
} from "./gameShellLobbyReturn";

const KEY = "ffgt:game-shell-lobby-return";

function installSessionStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

beforeEach(() => {
  installSessionStorageMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameShellLobbyReturn", () => {
  it("write / peek / consume round-trip", () => {
    writeGameShellLobbyReturn({
      lobbyFilter: "providers",
      providerPlatform: "BGAMING",
      scrollY: 420,
    });
    expect(peekGameShellLobbyReturn()).toEqual({
      lobbyFilter: "providers",
      providerPlatform: "BGAMING",
      scrollY: 420,
    });
    expect(consumeGameShellLobbyReturn()).toEqual({
      lobbyFilter: "providers",
      providerPlatform: "BGAMING",
      scrollY: 420,
    });
    expect(peekGameShellLobbyReturn()).toBeNull();
  });

  it("consume returns null when empty", () => {
    expect(consumeGameShellLobbyReturn()).toBeNull();
  });

  it("rejects invalid stored payload", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ lobbyFilter: "nope", scrollY: 1 }),
    );
    expect(consumeGameShellLobbyReturn()).toBeNull();
  });

  it("buildGameShellLobbyReturn trims provider platform", () => {
    vi.stubGlobal("window", { scrollY: 100 });
    expect(
      buildGameShellLobbyReturn("hot", "  PRAGMATIC  ").providerPlatform,
    ).toBe("PRAGMATIC");
  });
});
