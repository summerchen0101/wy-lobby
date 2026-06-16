import { publicImageUrl } from "./publicImageUrl";
import type { ActiveWallet } from "../wallet/walletContext";

export const LOBBY_LOADING_IMAGE = publicImageUrl(
  "/images/brand/lobby-loading.png",
);

export const LANDING_HEADER_LOGO = publicImageUrl(
  "/images/compliance/img_logo.png",
);

export const HEADER_BRAND_LOGO_GC = publicImageUrl(
  "/images/brand/header-logo-b.png",
);

export function getHeaderBrandLogoUrl(wallet: ActiveWallet): string {
  return publicImageUrl(
    wallet === "SC"
      ? "/images/brand/header-logo-a.png"
      : "/images/brand/header-logo-b.png",
  );
}
