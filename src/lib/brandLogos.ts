import { publicImageUrl } from "./publicImageUrl";
import type { ActiveWallet } from "../wallet/walletContext";

export const LOBBY_LOADING_IMAGE = publicImageUrl(
  "/images/brand/lobby-loading.png",
);

export const HEADER_BRAND_LOGO_GC = publicImageUrl(
  "/images/brand/header-logo-b.webp",
);

export function getHeaderBrandLogoUrl(wallet: ActiveWallet): string {
  return publicImageUrl(
    wallet === "SC"
      ? "/images/brand/header-logo-a.webp"
      : "/images/brand/header-logo-b.webp",
  );
}
