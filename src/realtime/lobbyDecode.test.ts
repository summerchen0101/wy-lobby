import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  isNoviceTeachingGeneralDone,
  noviceTeachingGeneralFromLobbyGet,
  shouldShowNoviceTeachingGeneralTutorial,
  lobbyDecodedGamesToApiGames,
  lobbyThirdPartyListToApiGames,
  decodeLobbyGetResponseBytes,
  type LobbyGetDecoded,
} from "./lobbyDecode";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);
const LobbyGetResponseType = root.lookupType("megaman.LobbyGetResponse");

function encodeLobbyGet(playerInfo: Record<string, unknown>): Uint8Array {
  const msg = LobbyGetResponseType.create({ playerInfo });
  return Uint8Array.from(LobbyGetResponseType.encode(msg).finish());
}

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

describe("isNoviceTeachingGeneralDone", () => {
  it("returns false when general is 0", () => {
    const lobbyGet = {
      playerInfo: { noviceTeaching: { general: 0 } },
    } as unknown as LobbyGetDecoded;
    expect(isNoviceTeachingGeneralDone(lobbyGet)).toBe(false);
    expect(shouldShowNoviceTeachingGeneralTutorial(lobbyGet)).toBe(true);
  });

  it("returns true when general is 1", () => {
    const lobbyGet = {
      playerInfo: { noviceTeaching: { general: 1 } },
    } as unknown as LobbyGetDecoded;
    expect(isNoviceTeachingGeneralDone(lobbyGet)).toBe(true);
    expect(shouldShowNoviceTeachingGeneralTutorial(lobbyGet)).toBe(false);
  });

  it("returns false when noviceTeaching is missing", () => {
    const lobbyGet = {
      playerInfo: { userID: "123" },
    } as unknown as LobbyGetDecoded;
    expect(isNoviceTeachingGeneralDone(lobbyGet)).toBe(false);
    expect(shouldShowNoviceTeachingGeneralTutorial(lobbyGet)).toBe(false);
  });

  it("decodes general=1 from protobuf wire bytes", () => {
    const data = encodeLobbyGet({
      userID: "2084595942960222208",
      noviceTeaching: { general: 1 },
    });
    const decoded = decodeLobbyGetResponseBytes(data);
    expect(noviceTeachingGeneralFromLobbyGet(decoded)).toBe(1);
    expect(isNoviceTeachingGeneralDone(decoded)).toBe(true);
    expect(shouldShowNoviceTeachingGeneralTutorial(decoded)).toBe(false);
  });

  it("decodes general=0 from protobuf wire bytes", () => {
    const data = encodeLobbyGet({
      userID: "2084595942960222208",
      noviceTeaching: { general: 0 },
    });
    const decoded = decodeLobbyGetResponseBytes(data);
    expect(noviceTeachingGeneralFromLobbyGet(decoded)).toBe(0);
    expect(shouldShowNoviceTeachingGeneralTutorial(decoded)).toBe(true);
  });
});
