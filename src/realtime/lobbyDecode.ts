import "./ensureProtobufLong";
import * as protobuf from "protobufjs/light.js";
import type { Game, LobbyWalletType, User } from "../lib/api/types";
import { getUnityWebEntryBase } from "../lib/env";
import { thirdPartyPlatformDisplayName } from "../lib/thirdPartyPlatformDisplay";
import schema from "../gen/lobby_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const LobbyGetResponseType = mustLookup("megaman.LobbyGetResponse");

export function decodeLobbyGetResponseBytes(data: Uint8Array) {
  const msg = LobbyGetResponseType.decode(data);
  return LobbyGetResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  });
}

export type LobbyGetDecoded = ReturnType<typeof decodeLobbyGetResponseBytes>;

type LobbyGameRow = NonNullable<
  NonNullable<LobbyGetDecoded["games"]>["games"]
>[number];

/** megaman.GameStatus.ENABLE（僅此狀態列於大廳） */
function isLobbyGameRowEnabled(row: LobbyGameRow): boolean {
  const st = row.status;
  if (st === 1 || st === "1") return true;
  if (typeof st === "string" && st.trim().toUpperCase() === "ENABLE")
    return true;
  return false;
}

function numFromWire(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (
    v &&
    typeof v === "object" &&
    "toString" in v &&
    typeof (v as { toString: () => string }).toString === "function"
  ) {
    const n = Number((v as { toString: () => string }).toString());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** LOBBY_GET `playerInfo.noviceTeaching.general`；無欄位時為 `undefined`。 */
export function noviceTeachingGeneralFromLobbyGet(
  lobbyGet: LobbyGetDecoded | null | undefined,
): number | undefined {
  const p = lobbyGet?.playerInfo;
  if (!p || typeof p !== "object") return undefined;
  const nt = (p as { noviceTeaching?: { general?: unknown } | null })
    .noviceTeaching;
  if (!nt || typeof nt !== "object") return undefined;
  return numFromWire((nt as { general?: unknown }).general);
}

/** LOBBY_GET `playerInfo.noviceTeaching.general`：0 = 尚未完成一般新手教學。 */
export function isNoviceTeachingGeneralDone(
  lobbyGet: LobbyGetDecoded | null | undefined,
): boolean {
  const general = noviceTeachingGeneralFromLobbyGet(lobbyGet);
  return general !== undefined && general !== 0;
}

/** 僅在 LOBBY_GET 已帶入且 `general === 0` 時顯示一般新手教學。 */
export function shouldShowNoviceTeachingGeneralTutorial(
  lobbyGet: LobbyGetDecoded | null | undefined,
): boolean {
  return noviceTeachingGeneralFromLobbyGet(lobbyGet) === 0;
}

/** megaman.GameLabel 數值（若 toObject 未轉成字串則用此對應） */
const GAME_LABEL_NUM_TO_NAME: Record<number, string> = {
  0: "UNKNOWN_LABEL",
  1: "HOT",
  2: "LATEST",
  3: "UNDER_MAINTENANCE",
  4: "COMING_SOON",
  5: "GENERAL",
};

const GAME_CATEGORY_NUM_TO_NAME: Record<number, string> = {
  0: "UNKNOWN_CATEGORY",
  1: "SLOT",
  2: "TABLE",
  3: "OTHER",
  4: "SCRATCHOFF",
};

function lobbyLabelFromRow(labelRaw: unknown): string | undefined {
  if (typeof labelRaw === "string" && labelRaw.trim()) {
    return labelRaw.trim();
  }
  if (typeof labelRaw === "number" && Number.isInteger(labelRaw)) {
    return GAME_LABEL_NUM_TO_NAME[labelRaw] ?? String(labelRaw);
  }
  return undefined;
}

function lobbyCategoryFromRow(categoryRaw: unknown): string | undefined {
  if (typeof categoryRaw === "string" && categoryRaw.trim()) {
    return categoryRaw.trim();
  }
  if (typeof categoryRaw === "number" && Number.isInteger(categoryRaw)) {
    return GAME_CATEGORY_NUM_TO_NAME[categoryRaw] ?? String(categoryRaw);
  }
  return undefined;
}

function sortFieldFromWire(v: unknown): number {
  const n = numFromWire(v);
  return n !== undefined ? n : 0;
}

function lobbyGameRowToApiGame(g: LobbyGameRow): Game {
  const id = String(g.ID ?? "");
  const path = typeof g.path === "string" ? g.path.trim() : "";
  const icon = typeof g.iconURL === "string" ? g.iconURL.trim() : "";
  const lobbyLabel = lobbyLabelFromRow(g.label);
  const lobbyCategory = lobbyCategoryFromRow(g.category);
  const providerRaw = g.providerName;
  const provider =
    typeof providerRaw === "string" && providerRaw.trim()
      ? providerRaw.trim()
      : undefined;
  let launchUrl = "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    launchUrl = path;
  } else if (path && id) {
    try {
      const u = new URL(getUnityWebEntryBase());
      u.searchParams.set("game_id", id);
      launchUrl = u.toString();
    } catch {
      launchUrl = "";
    }
  }
  return {
    id,
    title: typeof g.displayName === "string" ? g.displayName : id || "Game",
    thumbnailUrl: icon || undefined,
    launchUrl,
    lobbyLabel,
    lobbyCategory,
    provider,
    lobbySortFields: {
      sort: sortFieldFromWire(g.sort),
      hotSort: sortFieldFromWire(g.hotSort),
      slotSort: sortFieldFromWire(g.slotSort),
      cardSort: sortFieldFromWire(g.cardSort),
      fishSort: sortFieldFromWire(g.fishSort),
      arcadeSort: sortFieldFromWire(g.arcadeSort),
      lotterySort: sortFieldFromWire(g.lotterySort),
      battleSort: sortFieldFromWire(g.battleSort),
      classicSort: sortFieldFromWire(g.classicSort),
    },
  };
}

export type LobbyGameSortMenu =
  | "all"
  | "hot"
  | "slots"
  | "new"
  | "shooting"
  | "arcade"
  | "exclusive"
  | "battle"
  | "classic"
  | "providers";

/** 與 docs/lobby ELobbyMenuType 對照之排序欄位（default 用 0 → 以 sort 為 0 時穩定） */
export function lobbySortKeyForMenu(
  menu: LobbyGameSortMenu,
): keyof NonNullable<Game["lobbySortFields"]> {
  switch (menu) {
    case "hot":
      return "hotSort";
    case "slots":
      return "slotSort";
    case "new":
      return "cardSort";
    case "shooting":
      return "fishSort";
    case "arcade":
      return "arcadeSort";
    case "exclusive":
      return "lotterySort";
    case "battle":
      return "battleSort";
    case "classic":
      return "classicSort";
    case "all":
    case "providers":
    default:
      return "sort";
  }
}

function compareGamesByLobbySort(
  a: Game,
  b: Game,
  menu: LobbyGameSortMenu,
): number {
  const key = lobbySortKeyForMenu(menu);
  const fa = a.lobbySortFields?.[key] ?? 0;
  const fb = b.lobbySortFields?.[key] ?? 0;
  if (fb !== fa) return fb - fa;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

/** 依目前分類分頁對 `Game[]` 做排序（大到小，見 docs/lobby）。 */
export function sortLobbyGamesByMenu(
  games: Game[],
  menu: LobbyGameSortMenu,
): Game[] {
  const copy = [...games];
  copy.sort((a, b) => compareGamesByLobbySort(a, b, menu));
  return copy;
}

/** 將 LOBBY_GET 解碼結果轉成大廳 Game 列表（launchUrl 僅在 path 為 http(s) 或可組 WebEntry 時填入）。 */
export function lobbyDecodedGamesToApiGames(decoded: LobbyGetDecoded): Game[] {
  const games: LobbyGameRow[] = decoded.games?.games ?? [];
  return games
    .filter(isLobbyGameRowEnabled)
    .map((row) => lobbyGameRowToApiGame(row));
}

type LobbyThirdPartyRow = NonNullable<
  NonNullable<LobbyGetDecoded["thirdPartyGameInfoList"]>
>[number];

function thirdPartyRowString(
  row: LobbyThirdPartyRow,
  ...keys: string[]
): string {
  const rec = row as Record<string, unknown>;
  for (const key of keys) {
    const raw = rec[key];
    if (typeof raw === "string") {
      const s = raw.trim();
      if (s) return s;
      continue;
    }
    if (raw !== undefined && raw !== null && typeof raw !== "object") {
      const s = String(raw).trim();
      if (s) return s;
    }
  }
  return "";
}

/** 大廳僅顯示 status 為 ACTIVE 之第三方遊戲（大小寫不敏感）。 */
function lobbyThirdPartyRowIsActive(row: LobbyThirdPartyRow): boolean {
  return thirdPartyRowString(row, "status").toUpperCase() === "ACTIVE";
}

/**
 * `LobbyGet.thirdPartyGameInfoList` 單筆 → 大廳卡片（順序交由呼叫端維持後端順序）。
 * 無效列（缺少 platform／gameUID）回傳 null。
 */
export function lobbyThirdPartyRowToApiGame(
  row: LobbyThirdPartyRow,
): Game | null {
  const platform = thirdPartyRowString(row, "platform", "Platform");
  const uid = thirdPartyRowString(row, "gameUID", "gameUid", "GameUID");
  if (!platform || !uid) return null;
  const name =
    thirdPartyRowString(row, "gameName", "GameName") || uid;
  const displayPlatform = thirdPartyPlatformDisplayName(platform);
  return {
    id: `tp:${encodeURIComponent(platform)}:${encodeURIComponent(uid)}`,
    title: name,
    subtitle: displayPlatform,
    launchUrl: "",
    provider: displayPlatform,
    thirdPartyLaunch: { platform, gameUID: uid },
  };
}

/** 後端已排序之第三方列表（僅 ACTIVE）；勿再呼叫 sortLobbyGamesByMenu。 */
export function lobbyThirdPartyListToApiGames(
  list: LobbyGetDecoded["thirdPartyGameInfoList"] | undefined | null,
): Game[] {
  const rows = list ?? [];
  const out: Game[] = [];
  for (const row of rows) {
    if (!lobbyThirdPartyRowIsActive(row)) continue;
    const g = lobbyThirdPartyRowToApiGame(row);
    if (g) out.push(g);
  }
  return out;
}

type LobbyPlayerRow = NonNullable<LobbyGetDecoded["playerInfo"]>;

function lobbyWalletTypeFromWire(raw: unknown): LobbyWalletType | undefined {
  if (raw === "GC" || raw === 1 || raw === "1") return "GC";
  if (raw === "SC" || raw === 2 || raw === "2") return "SC";
  if (raw === "UNKNOWN_WALLET_TYPE" || raw === 0 || raw === "0")
    return "UNKNOWN";
  return undefined;
}

/**
 * LOBBY_GET 內 `playerInfo`（與 megaman.LobbyGetResponse 欄位 3 對齊）轉成可 merge 進 `User` 的欄位。
 */
function isGoldenCoinType(raw: unknown): boolean {
  return raw === "GOLDEN" || raw === 1 || raw === "1";
}

type BagRow = NonNullable<LobbyGetDecoded["bag"]>;

function sumGoldenAmountFromBag(
  bag: BagRow | null | undefined,
): number | undefined {
  if (!bag?.coins?.length) return undefined;
  let sum = 0;
  for (const c of bag.coins) {
    if (!c || typeof c !== "object") continue;
    if (!isGoldenCoinType((c as { type?: unknown }).type)) continue;
    const n = numFromWire((c as { amount?: unknown }).amount);
    if (n !== undefined) sum += n;
  }
  return sum;
}

/**
 * LOBBY_GET `bag` / `bagGC`（欄位 1、19）→ `User.balance`（GC）與 `sweepstakesBalance`（SC）。
 * 命名依 proto：`bagGC` 對應 GC 顯示餘額，`bag` 對應 SC。
 */
export function lobbyDecodedBagsToUserBalancePatch(
  decoded: LobbyGetDecoded,
): Partial<User> | null {
  const gc = sumGoldenAmountFromBag(decoded.bagGC ?? undefined);
  const sc = sumGoldenAmountFromBag(decoded.bag ?? undefined);
  if (gc === undefined && sc === undefined) return null;
  const out: Partial<User> = {};
  if (gc !== undefined) out.balance = gc;
  if (sc !== undefined) out.sweepstakesBalance = sc;
  return out;
}

export function lobbyDecodedPlayerToUserPatch(
  decoded: LobbyGetDecoded,
): Partial<User> | null {
  const p = decoded.playerInfo as LobbyPlayerRow | null | undefined;
  const idRaw = p && typeof p === "object" ? p.userID : undefined;
  const id = idRaw != null && String(idRaw) !== "" ? String(idRaw) : undefined;
  const nickRaw = p && typeof p === "object" ? p.nickname : undefined;
  const displayName =
    typeof nickRaw === "string" && nickRaw.trim() ? nickRaw.trim() : undefined;
  const vipLevel =
    p && typeof p === "object" ? numFromWire(p.vipLevel) : undefined;
  const avatarRaw =
    p && typeof p === "object"
      ? (p as { avatarID?: unknown }).avatarID
      : undefined;
  const avatarNum = numFromWire(avatarRaw);
  const avatarId =
    avatarNum !== undefined && avatarNum >= 1
      ? Math.floor(avatarNum)
      : undefined;
  const cellRaw =
    p && typeof p === "object"
      ? (p as { cellPhone?: unknown }).cellPhone
      : undefined;
  const cellPhone =
    typeof cellRaw === "string" && cellRaw.trim() ? cellRaw.trim() : undefined;
  const walletRaw =
    p && typeof p === "object"
      ? (p as { walletType?: unknown }).walletType
      : undefined;
  const lobbyWalletType = lobbyWalletTypeFromWire(walletRaw);
  const vipExp = numFromWire(
    p && typeof p === "object"
      ? (p as { vipCurrentLevelExp?: unknown }).vipCurrentLevelExp
      : undefined,
  );
  const vipExpReq = numFromWire(
    p && typeof p === "object"
      ? (p as { vipCurrentLevelExpRequired?: unknown })
          .vipCurrentLevelExpRequired
      : undefined,
  );
  const vipBet = numFromWire(
    p && typeof p === "object"
      ? (p as { vipCurrentLevelBetExp?: unknown }).vipCurrentLevelBetExp
      : undefined,
  );
  const vipBetReq = numFromWire(
    p && typeof p === "object"
      ? (p as { vipCurrentLevelBetExpRequired?: unknown })
          .vipCurrentLevelBetExpRequired
      : undefined,
  );
  const phoneFromPlayer = (p as { phone?: unknown } | null)?.phone;
  const phonePlayer =
    typeof phoneFromPlayer === "string" && phoneFromPlayer.trim()
      ? phoneFromPlayer.trim()
      : undefined;
  const phoneRoot =
    typeof decoded.phone === "string" && decoded.phone.trim()
      ? decoded.phone.trim()
      : undefined;
  const phone = phoneRoot ?? cellPhone ?? phonePlayer;
  const email =
    typeof decoded.email === "string" && decoded.email.trim()
      ? decoded.email.trim()
      : undefined;
  const addressRaw =
    p && typeof p === "object"
      ? (p as { address?: unknown }).address
      : undefined;
  const address =
    typeof addressRaw === "string" && addressRaw.trim()
      ? addressRaw.trim()
      : undefined;
  const minTxWdraw = numFromWire(
    p && typeof p === "object"
      ? (p as { minTxWdraw?: unknown }).minTxWdraw
      : undefined,
  );
  if (
    !id &&
    !displayName &&
    vipLevel === undefined &&
    !phone &&
    !email &&
    !address &&
    minTxWdraw === undefined &&
    avatarId === undefined &&
    lobbyWalletType === undefined &&
    vipExp === undefined &&
    vipExpReq === undefined &&
    vipBet === undefined &&
    vipBetReq === undefined
  )
    return null;
  const out: Partial<User> = {};
  if (id) out.id = id;
  if (displayName) out.displayName = displayName;
  if (vipLevel !== undefined) out.vipLevel = Math.floor(vipLevel);
  if (avatarId !== undefined) out.avatarId = avatarId;
  if (lobbyWalletType !== undefined) out.lobbyWalletType = lobbyWalletType;
  if (vipExp !== undefined) out.vipCurrentLevelExp = Math.floor(vipExp);
  if (vipExpReq !== undefined)
    out.vipCurrentLevelExpRequired = Math.floor(vipExpReq);
  if (vipBet !== undefined) out.vipCurrentLevelBetExp = Math.floor(vipBet);
  if (vipBetReq !== undefined)
    out.vipCurrentLevelBetExpRequired = Math.floor(vipBetReq);
  if (phone) out.phone = phone;
  if (email) out.email = email;
  if (address) out.address = address;
  if (minTxWdraw !== undefined) out.minTxWdraw = Math.floor(minTxWdraw);
  return out;
}

export type RedeemPlayerBindingState = {
  hasCellPhone: boolean;
  hasAddress: boolean;
  /** LOBBY_GET 子集可能帶 frontImage；提領 KYC 請用 GET_PLAYER_INFO (20)。 */
  hasFrontImage: boolean;
  /** 後端 minTxWdraw 原始單位；未提供時 undefined */
  minTxWdrawRaw: number | undefined;
};

/** 提現前綁定閘道：依 LOBBY_GET playerInfo.cellPhone / address。 */
export function redeemPlayerBindingFromLobby(
  lobbyGet: LobbyGetDecoded | null | undefined,
): RedeemPlayerBindingState {
  const p = lobbyGet?.playerInfo as LobbyPlayerRow | null | undefined;
  const cellRaw =
    p && typeof p === "object"
      ? (p as { cellPhone?: unknown }).cellPhone
      : undefined;
  const cellPhone =
    typeof cellRaw === "string" && cellRaw.trim() ? cellRaw.trim() : "";
  const addressRaw =
    p && typeof p === "object"
      ? (p as { address?: unknown }).address
      : undefined;
  const address =
    typeof addressRaw === "string" && addressRaw.trim()
      ? addressRaw.trim()
      : "";
  const frontImageRaw =
    p && typeof p === "object"
      ? (p as { frontImage?: unknown }).frontImage
      : undefined;
  const frontImage =
    typeof frontImageRaw === "string" && frontImageRaw.trim()
      ? frontImageRaw.trim()
      : "";
  const minTxWdrawRaw = numFromWire(
    p && typeof p === "object"
      ? (p as { minTxWdraw?: unknown }).minTxWdraw
      : undefined,
  );
  return {
    hasCellPhone: cellPhone.length > 0,
    hasAddress: address.length > 0,
    hasFrontImage: frontImage.length > 0,
    minTxWdrawRaw:
      minTxWdrawRaw !== undefined ? Math.floor(minTxWdrawRaw) : undefined,
  };
}

function lobbyDecodedCurrencyToUserPatch(
  decoded: LobbyGetDecoded,
): Partial<User> | null {
  const raw = decoded.currency;
  if (raw === undefined || raw === null || String(raw) === "") return null;
  return { currency: String(raw) };
}

/** 合併 playerInfo、email/phone、幣值與雙錢包餘額，供 LOBBY_GET 成功後一次 mergeUser。 */
export function lobbyDecodedToUserPatch(
  decoded: LobbyGetDecoded,
): Partial<User> {
  return {
    ...(lobbyDecodedPlayerToUserPatch(decoded) ?? {}),
    ...(lobbyDecodedBagsToUserBalancePatch(decoded) ?? {}),
    ...(lobbyDecodedCurrencyToUserPatch(decoded) ?? {}),
  };
}
