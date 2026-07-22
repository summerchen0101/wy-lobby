export const PROVIDER_TAB_PREFIX = "provider:" as const;

export type StaticLobbyFilterTab = "all" | "hot" | "providers" | "slots";
export type LobbyFilterTab =
  | StaticLobbyFilterTab
  | `${typeof PROVIDER_TAB_PREFIX}${string}`;

export type GameShellLobbyReturn = {
  lobbyFilter: LobbyFilterTab;
  providerPlatform: string | null;
  scrollY: number;
};

const STORAGE_KEY = "ffgt:game-shell-lobby-return";

export function isProviderTabId(
  id: string,
): id is `${typeof PROVIDER_TAB_PREFIX}${string}` {
  return id.startsWith(PROVIDER_TAB_PREFIX) && id.length > PROVIDER_TAB_PREFIX.length;
}

export function providerTabId(platform: string): LobbyFilterTab {
  return `${PROVIDER_TAB_PREFIX}${platform}`;
}

export function providerPlatformFromTabId(id: LobbyFilterTab): string | null {
  if (!isProviderTabId(id)) return null;
  return id.slice(PROVIDER_TAB_PREFIX.length);
}

export function lobbyTabDomId(id: LobbyFilterTab): string {
  return `lobby-tab-${encodeURIComponent(id)}`;
}

function isValidLobbyFilter(filter: string): filter is LobbyFilterTab {
  if (
    filter === "all" ||
    filter === "hot" ||
    filter === "providers" ||
    filter === "slots"
  ) {
    return true;
  }
  return isProviderTabId(filter);
}

function parseStored(raw: string): GameShellLobbyReturn | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameShellLobbyReturn>;
    const lobbyFilter = parsed.lobbyFilter;
    if (!lobbyFilter || !isValidLobbyFilter(lobbyFilter)) return null;
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
