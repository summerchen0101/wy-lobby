export const LOBBY_WALLET_GET_CHECK_EVENT = "ffgt:lobby-wallet-get:check";

const PENDING_FORCE_KEY = "ffgt:lobby-wallet-get:pending-force";

export type LobbyWalletGetCheckDetail = {
  /** 略過 WALLET_GET 快取（儲值／提現回來後應帶 true）。 */
  force?: boolean;
};

export function markPendingLobbyWalletGetForce(): void {
  try {
    sessionStorage.setItem(PENDING_FORCE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumePendingLobbyWalletGetForce(): boolean {
  try {
    const v = sessionStorage.getItem(PENDING_FORCE_KEY);
    if (v !== "1") return false;
    sessionStorage.removeItem(PENDING_FORCE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function requestLobbyWalletGetCheck(
  detail: LobbyWalletGetCheckDetail = {},
): void {
  window.dispatchEvent(
    new CustomEvent<LobbyWalletGetCheckDetail>(LOBBY_WALLET_GET_CHECK_EVENT, {
      detail,
    }),
  );
}

/** 儲值動效結束後回大廳：標記下次 WALLET_GET 必須 force。 */
export function scheduleLobbyWalletGetAfterShopReward(): void {
  markPendingLobbyWalletGetForce();
  requestLobbyWalletGetCheck({ force: true });
}
