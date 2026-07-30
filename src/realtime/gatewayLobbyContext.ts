import { createContext, type MutableRefObject } from "react";
import type { Game } from "../lib/api/types";
import type { GatewayWsRequestFn } from "./gatewayWs";
import type { LobbyGetDecoded } from "./lobbyDecode";
import type { ShopPack } from "../features/shop/types";
import type { PaymentPushWire } from "./shopLobbyWire";
import type {
  WithdrawOrderWireRow,
  WithdrawSuccessPushWire,
} from "./withdrawLobbyWire";

export type PaymentFinishListener = (push: PaymentPushWire) => void;

export type WithdrawSuccessPushListener = (
  push: WithdrawSuccessPushWire,
) => void;

/** Redeem 第一頁快取（與 RedeemPage ORDERS_PER_PAGE 對齊）；進入 /redeem 時載入。 */
export type RedeemOrdersPrefetch = {
  rows: WithdrawOrderWireRow[];
  total: number;
};

export type GatewayLobbyContextValue = {
  requestRef: MutableRefObject<GatewayWsRequestFn | null>;
  /** Gateway WS `onOpen` 已設定且可使用 `request()`（非 WS 環境為 false） */
  gatewayRequestReady: boolean;
  lobbyGames: Game[] | null;
  lobbyLoading: boolean;
  lobbyError: string | null;
  liveJackpotAmounts: readonly [number, number, number] | null;
  /** 最近一次成功解碼的 LOBBY_GET（與 megaman.LobbyGetResponse 對齊） */
  lobbyGet: LobbyGetDecoded | null;
  /** 再次請求 LOBBY_GET 並更新遊戲列表／錢包（例如關閉遊戲 iframe 後） */
  refreshLobbyGet: () => Promise<void>;
  subscribePaymentFinish: (listener: PaymentFinishListener) => () => void;
  subscribeWithdrawSuccessPush: (
    listener: WithdrawSuccessPushListener,
  ) => () => void;
  /** 首轮 WebSocket LOBBY_GET bootstrap 未定前為 true（全屏閘門用） */
  needsLobbyHydrationOverlay: boolean;
  /** 商店品項；進入 /shop 時載入，null 表示尚未載入 */
  shopPacks: ShopPack[] | null;
  /** 載入或刷新商店品項 */
  refreshShopPacks: () => Promise<void>;
  /** 第一頁提領紀錄快取；進入 /redeem 時載入，null 表示尚未載入 */
  redeemOrdersPrefetch: RedeemOrdersPrefetch | null;
};

export const GatewayLobbyContext =
  createContext<GatewayLobbyContextValue | null>(null);
