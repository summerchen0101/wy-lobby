import { describe, expect, it } from "vitest";
import {
  lobbyDecodedGamesToApiGames,
  lobbyThirdPartyListToApiGames,
  type LobbyGetDecoded,
} from "./lobbyDecode";

/** LOBBY_GET `games.games` 單列最小形狀（其餘 wire 欄位省略） */
function gameRow(
  id: string,
  status: unknown,
  path = "Slot1.res",
): Record<string, unknown> {
  return {
    ID: id,
    displayName: `Game ${id}`,
    status,
    path,
    sort: 0,
    hotSort: 0,
    slotSort: 0,
    cardSort: 0,
    fishSort: 0,
    arcadeSort: 0,
    lotterySort: 0,
    battleSort: 0,
    classicSort: 0,
  };
}

describe("lobbyDecodedGamesToApiGames", () => {
  it("只保留 status 為 ENABLE 的列", () => {
    const decoded = {
      games: {
        games: [
          gameRow("1", "ENABLE"),
          gameRow("2", "DISABLE"),
          gameRow("3", "MAINTAINING"),
          gameRow("4", "COMING"),
          gameRow("5", 1),
          gameRow("6", "1"),
          gameRow("7", 0),
          gameRow("8", undefined),
          gameRow("9", "enable"),
        ],
      },
    } as unknown as LobbyGetDecoded;
    const items = lobbyDecodedGamesToApiGames(decoded);
    expect(items.map((g) => g.id).sort()).toEqual(["1", "5", "6", "9"]);
  });
});

describe("lobbyThirdPartyListToApiGames", () => {
  it("僅保留 status 為 ACTIVE 的列", () => {
    const decoded = {
      thirdPartyGameInfoList: [
        {
          platform: "BGAMING",
          gameUID: "game-a",
          gameName: "Game A",
          status: "ACTIVE",
        },
        {
          platform: "BGAMING",
          gameUID: "game-b",
          gameName: "Game B",
          status: "active",
        },
        {
          platform: "BGAMING",
          gameUID: "game-c",
          gameName: "Game C",
        },
        {
          platform: "BGAMING",
          gameUID: "game-d",
          gameName: "Game D",
          status: "INACTIVE",
        },
        {
          platform: "BGAMING",
          gameUID: "game-e",
          gameName: "Game E",
          status: "ENABLE",
        },
      ],
    } as unknown as LobbyGetDecoded;
    const items = lobbyThirdPartyListToApiGames(decoded.thirdPartyGameInfoList);
    expect(items.map((g) => g.thirdPartyLaunch?.gameUID)).toEqual([
      "game-a",
      "game-b",
    ]);
  });

  it("略過缺少 platform 或 gameUID 的列", () => {
    const items = lobbyThirdPartyListToApiGames([
      { platform: "BGAMING", gameUID: "ok", status: "ACTIVE" },
      { platform: "", gameUID: "missing-platform", status: "ACTIVE" },
      { platform: "BGAMING", gameUID: "", status: "ACTIVE" },
    ] as unknown as LobbyGetDecoded["thirdPartyGameInfoList"]);
    expect(items).toHaveLength(1);
    expect(items[0]?.thirdPartyLaunch?.gameUID).toBe("ok");
  });

  it("maps MICROGAMING platform to M2PLAY for display", () => {
    const items = lobbyThirdPartyListToApiGames([
      {
        platform: "MICROGAMING",
        gameUID: "mg-1",
        gameName: "Test Game",
        status: "ACTIVE",
      },
    ] as unknown as LobbyGetDecoded["thirdPartyGameInfoList"]);
    expect(items[0]?.subtitle).toBe("M2PLAY");
    expect(items[0]?.provider).toBe("M2PLAY");
    expect(items[0]?.thirdPartyLaunch?.platform).toBe("MICROGAMING");
  });
});
