import type { ActiveWallet } from "../wallet/walletContext";
import { publicImageUrl } from "./publicImageUrl";

export const CURRENCY_ICON_GC = publicImageUrl("/images/currency/icon_GC.png");
export const CURRENCY_ICON_SC = publicImageUrl("/images/currency/icon_SC.png");

/** Text-style GC/SC art for header pill only; elsewhere use coin icons. */
export const CURRENCY_TEXT_GC = publicImageUrl("/images/currency/text_GC.png");
export const CURRENCY_TEXT_SC = publicImageUrl("/images/currency/text_SC.png");

export function getCurrencyIconUrl(kind: ActiveWallet): string {
  return kind === "GC" ? CURRENCY_ICON_GC : CURRENCY_ICON_SC;
}

export function getCurrencyTextIconUrl(kind: ActiveWallet): string {
  return kind === "GC" ? CURRENCY_TEXT_GC : CURRENCY_TEXT_SC;
}
