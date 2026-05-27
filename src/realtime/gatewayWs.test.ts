import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGatewayWs,
  getActiveGatewaySocketForTest,
  getActiveGatewayWsClientForTest,
} from "./gatewayWs";

type MockWsInstance = WebSocket & {
  simulateOpen: () => void;
};

const createdSockets: MockWsInstance[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({
      code: 1000,
      reason: "",
      wasClean: true,
    } as CloseEvent);
  });
  send = vi.fn();

  constructor(url: string) {
    this.url = url;
    const inst = this as unknown as MockWsInstance;
    inst.simulateOpen = () => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    };
    createdSockets.push(inst);
  }
}

describe("createGatewayWs active socket mutex", () => {
  beforeEach(() => {
    createdSockets.length = 0;
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("closes the previous client socket when a new client opens", () => {
    const clientA = createGatewayWs({
      url: "ws://test.example/a",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientA.open();
    const socketA = createdSockets[0]!;
    socketA.simulateOpen();

    const clientB = createGatewayWs({
      url: "ws://test.example/b",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientB.open();
    const socketB = createdSockets[1]!;

    expect(socketA.close).toHaveBeenCalledTimes(1);
    expect(getActiveGatewaySocketForTest()).toBe(socketB);
  });

  it("closes a CONNECTING socket when another client opens", () => {
    const clientA = createGatewayWs({
      url: "ws://test.example/a",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientA.open();
    const socketA = createdSockets[0]!;
    expect(socketA.readyState).toBe(MockWebSocket.CONNECTING);

    const clientB = createGatewayWs({
      url: "ws://test.example/b",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientB.open();

    expect(socketA.close).toHaveBeenCalledTimes(1);
    expect(getActiveGatewaySocketForTest()).toBe(createdSockets[1]);
  });

  it("clears active socket after client close and allows a new client", () => {
    const clientA = createGatewayWs({
      url: "ws://test.example/a",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientA.open();
    const socketA = createdSockets[0]!;
    socketA.simulateOpen();
    expect(getActiveGatewaySocketForTest()).toBe(socketA);

    clientA.close();
    expect(getActiveGatewaySocketForTest()).toBeNull();

    const clientB = createGatewayWs({
      url: "ws://test.example/b",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientB.open();
    const socketB = createdSockets[1]!;
    expect(socketA.close).toHaveBeenCalledTimes(1);
    expect(getActiveGatewaySocketForTest()).toBe(socketB);
  });

  it("supersedes previous client and blocks its reconnect timer", () => {
    vi.useFakeTimers();
    const clientA = createGatewayWs({
      url: "ws://test.example/a",
      reconnect: true,
      initialReconnectDelayMs: 1_000,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientA.open();
    const socketA = createdSockets[0]!;
    socketA.simulateOpen();

    socketA.onclose?.({
      code: 1006,
      reason: "",
      wasClean: false,
    } as CloseEvent);
    expect(clientA.getState()).toBe("closed");

    const clientB = createGatewayWs({
      url: "ws://test.example/b",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 0,
    });
    clientB.open();
    expect(createdSockets).toHaveLength(2);
    expect(getActiveGatewayWsClientForTest()).toBe(clientB);

    vi.advanceTimersByTime(5_000);
    expect(createdSockets).toHaveLength(2);
  });

  it("does not open a new socket on close or visibility when reconnect is false", () => {
    vi.useFakeTimers();
    let visibilityState: DocumentVisibilityState = "visible";
    const visibilityListeners = new Set<() => void>();
    vi.stubGlobal("document", {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener(type: string, fn: () => void) {
        if (type === "visibilitychange") visibilityListeners.add(fn);
      },
      removeEventListener(type: string, fn: () => void) {
        if (type === "visibilitychange") visibilityListeners.delete(fn);
      },
    });

    const client = createGatewayWs({
      url: "ws://test.example/a",
      reconnect: false,
      skipInitialPing: true,
      heartbeatIntervalMs: 5_000,
    });
    client.open();
    const socketA = createdSockets[0]!;
    socketA.simulateOpen();

    socketA.onclose?.({
      code: 1006,
      reason: "",
      wasClean: false,
    } as CloseEvent);
    vi.advanceTimersByTime(60_000);

    visibilityState = "hidden";
    for (const fn of visibilityListeners) fn();
    visibilityState = "visible";
    for (const fn of visibilityListeners) fn();

    expect(createdSockets).toHaveLength(1);
  });
});
