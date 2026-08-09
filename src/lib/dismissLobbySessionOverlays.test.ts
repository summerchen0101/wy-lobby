import { afterEach, describe, expect, it } from "vitest";
import {
  clearLobbySessionEviction,
  dismissLobbySessionOverlays,
  isLobbySessionEvicted,
} from "./dismissLobbySessionOverlays";
import { isWelcomeVoiceGateOpen } from "./lobbyWelcomeVoiceGate";

afterEach(() => {
  clearLobbySessionEviction();
});

describe("dismissLobbySessionOverlays", () => {
  it("marks session evicted and closes welcome voice gate", () => {
    dismissLobbySessionOverlays();

    expect(isLobbySessionEvicted()).toBe(true);
    expect(isWelcomeVoiceGateOpen()).toBe(false);
  });

  it("clears eviction so gates can run again after login", () => {
    dismissLobbySessionOverlays();
    clearLobbySessionEviction();
    expect(isLobbySessionEvicted()).toBe(false);
  });
});
