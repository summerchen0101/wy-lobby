import type { ShopPack } from "./types";

export const SHOP_REWARD_DEV_PREVIEW_EVENT = "ffgt:shop-reward:dev-preview";

export type ShopRewardDevPreviewMode = "animation" | "success";

export type ShopRewardDevPreviewDetail = {
  mode: ShopRewardDevPreviewMode;
  pack?: ShopPack;
  /** 預設 dev preview 不跳大廳，方便重複看特效 */
  navigateAfter?: boolean;
};

export const SHOP_REWARD_DEV_MOCK_PACK: ShopPack = {
  id: "dev-mock-pack",
  productID: "dev-mock-product",
  gcLabel: "600K",
  bonusSc: 100,
  price: "$4.99",
  originalPrice: "$9.99",
  coinPile: 5,
  paymentTypes: [],
  vipExp: 0,
};

export function dispatchShopRewardDevPreview(
  detail: ShopRewardDevPreviewDetail,
): void {
  window.dispatchEvent(
    new CustomEvent(SHOP_REWARD_DEV_PREVIEW_EVENT, { detail }),
  );
}

export type ShopRewardDevApi = {
  /** 直接播放兩疊金幣 + 灑金幣（略過 SUCCESS 彈窗與建單） */
  previewAnimation: (pack?: ShopPack) => void;
  /** 只開 SUCCESS 彈窗；點 PLAY NOW 後才播動效 */
  previewSuccess: (pack?: ShopPack) => void;
  mockPack: () => ShopPack;
};

declare global {
  interface Window {
    __ffgtDevShopReward?: ShopRewardDevApi;
  }
}

export function installShopRewardDevMock(): void {
  if (!import.meta.env.DEV) return;

  const api: ShopRewardDevApi = {
    previewAnimation: (pack = SHOP_REWARD_DEV_MOCK_PACK) => {
      dispatchShopRewardDevPreview({
        mode: "animation",
        pack,
        navigateAfter: false,
      });
      console.info("[dev][shop-reward] previewAnimation() — 已播放購買獎勵動效");
    },
    previewSuccess: (pack = SHOP_REWARD_DEV_MOCK_PACK) => {
      dispatchShopRewardDevPreview({
        mode: "success",
        pack,
        navigateAfter: false,
      });
      console.info(
        "[dev][shop-reward] previewSuccess() — 已開啟 SUCCESS 彈窗；點 PLAY NOW 播動效",
      );
    },
    mockPack: () => ({ ...SHOP_REWARD_DEV_MOCK_PACK }),
  };

  window.__ffgtDevShopReward = api;
}

export function parseShopRewardDevQuery(
  raw: string | null,
): ShopRewardDevPreviewMode | null {
  if (!import.meta.env.DEV || raw == null) return null;
  const mode = raw.trim().toLowerCase();
  if (mode === "anim" || mode === "animation") return "animation";
  if (mode === "success") return "success";
  return null;
}
