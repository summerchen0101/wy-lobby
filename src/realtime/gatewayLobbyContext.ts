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

/** 登入後預取的 redeem 第一頁（與 RedeemPage ORDERS_PER_PAGE 對齊）。 */
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
  /** 登入 bootstrap 後預取的商店品項；null 表示尚未載入 */
  shopPacks: ShopPack[] | null;
  /** 預取或手動刷新商店品項 */
  refreshShopPacks: () => Promise<void>;
  /** 登入 bootstrap 後預取的第一頁提領紀錄 */
  redeemOrdersPrefetch: RedeemOrdersPrefetch | null;
};

export const GatewayLobbyContext =
  createContext<GatewayLobbyContextValue | null>(null);
