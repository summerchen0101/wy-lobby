import { publicImageUrl } from "./publicImageUrl";
import type { ActiveWallet } from "../wallet/walletContext";

const CHROME = publicImageUrl("/images/lobby/chrome");
const HEADER = `${CHROME}/header`;
const JP = `${CHROME}/jp`;
const FOOTER = `${CHROME}/footer`;

export function headerPillBgUrl(wallet: ActiveWallet): string {
  return wallet === "SC"
    ? `${HEADER}/pill-bg-sc.png`
    : `${HEADER}/pill-bg-gc.png`;
}

export function headerAvatarRingUrl(wallet: ActiveWallet): string {
  return wallet === "SC" ? `${HEADER}/ring-sc.png` : `${HEADER}/ring-gc.png`;
}

export function headerCoinLabelUrl(wallet: ActiveWallet): string {
  return wallet === "SC"
    ? `${HEADER}/coin-label-sc.png`
    : `${HEADER}/coin-label-gc.png`;
}

export function headerShopBtnUrl(wallet: ActiveWallet): string {
  return wallet === "SC"
    ? `${HEADER}/btn-iap-sc.png`
    : `${HEADER}/btn-iap-gc.png`;
}

export function headerWalletTrackBgUrl(wallet: ActiveWallet): string {
  return wallet === "SC"
    ? `${HEADER}/wallet-track-sc.png`
    : `${HEADER}/wallet-track-gc.png`;
}

export const JP_CELL_BG = [`${JP}/jp1.png`, `${JP}/jp2.png`, `${JP}/jp3.png`] as const;

export const JP_TEXT_LABEL = `${JP}/text-jp.png`;

export const JP_TEXT_INDEX = [
  `${JP}/text-n1.png`,
  `${JP}/text-n2.png`,
  `${JP}/text-n3.png`,
] as const;

export type FooterIconId = "shop" | "redeem" | "lobby" | "promo" | "profile";

const FOOTER_ICON: Record<FooterIconId, { normal: string; selected: string }> =
  {
    shop: {
      normal: `${FOOTER}/icon-shop.png`,
      selected: `${FOOTER}/icon-shop-sel.png`,
    },
    redeem: {
      normal: `${FOOTER}/icon-redeem.png`,
      selected: `${FOOTER}/icon-redeem-sel.png`,
    },
    lobby: {
      normal: `${FOOTER}/icon-lobby.png`,
      selected: `${FOOTER}/icon-lobby-sel.png`,
    },
    promo: {
      normal: `${FOOTER}/icon-promo.png`,
      selected: `${FOOTER}/icon-promo-sel.png`,
    },
    profile: {
      normal: `${FOOTER}/icon-profile.png`,
      selected: `${FOOTER}/icon-profile-sel.png`,
    },
  };

export function footerIconUrl(id: FooterIconId, selected: boolean): string {
  const pair = FOOTER_ICON[id];
  return selected ? pair.selected : pair.normal;
}

export const FOOTER_LOBBY_BUMP_GC = `${FOOTER}/lobby-sel-gc.png`;

/** LOBBY 選中時中間凸起底圖（384×203）；SC 專用圖就緒前沿用 GC。 */
export function footerLobbyBumpUrl(_wallet: ActiveWallet): string {
  void _wallet;
  return FOOTER_LOBBY_BUMP_GC;
}

/** @deprecated 使用 `footerLobbyBumpUrl` */
export const FOOTER_LOBBY_BUMP = FOOTER_LOBBY_BUMP_GC;
