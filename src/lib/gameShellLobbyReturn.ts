export type GameShellLobbyReturn = {
  lobbyFilter: "all" | "hot" | "providers" | "slots";
  providerPlatform: string | null;
  scrollY: number;
};

const STORAGE_KEY = "ffgt:game-shell-lobby-return";

const LOBBY_FILTERS = new Set<GameShellLobbyReturn["lobbyFilter"]>([
  "all",
  "hot",
  "providers",
  "slots",
]);

function parseStored(raw: string): GameShellLobbyReturn | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameShellLobbyReturn>;
    const lobbyFilter = parsed.lobbyFilter;
    if (!lobbyFilter || !LOBBY_FILTERS.has(lobbyFilter)) return null;
    const scrollY = parsed.scrollY;
    if (typeof scrollY !== "number" || !Number.isFinite(scrollY) || scrollY < 0) {
      return null;
    }
    const providerPlatform =
      typeof parsed.providerPlatform === "string"
        ? parsed.providerPlatform.trim() || null
        : parsed.providerPlatform === null
          ? null
          : null;
    return { lobbyFilter, providerPlatform, scrollY };
  } catch {
    return null;
  }
}

export function writeGameShellLobbyReturn(ctx: GameShellLobbyReturn): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekGameShellLobbyReturn(): GameShellLobbyReturn | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStored(raw);
  } catch {
    return null;
  }
}

export function consumeGameShellLobbyReturn(): GameShellLobbyReturn | null {
  const payload = peekGameShellLobbyReturn();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export function buildGameShellLobbyReturn(
  lobbyFilter: GameShellLobbyReturn["lobbyFilter"],
  providerPlatform: string | null,
): GameShellLobbyReturn {
  return {
    lobbyFilter,
    providerPlatform: providerPlatform?.trim() || null,
    scrollY: typeof window !== "undefined" ? window.scrollY : 0,
  };
}
