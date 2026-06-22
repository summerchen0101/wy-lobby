import { publicImageUrl } from "./publicImageUrl";
import type { ShopPaymentMethodId } from "../features/shop/paymentTypeMap";

const PAY_BASE = publicImageUrl("/images/shop/pay");

export const SHOP_PAY_ICON: Record<ShopPaymentMethodId, string> = {
  google: `${PAY_BASE}/icon_google.png`,
  apple: `${PAY_BASE}/icon_apple.png`,
  credit: `${PAY_BASE}/icon_card.png`,
  cashapp: `${PAY_BASE}/icon_cashApp.png`,
};

export function shopPayIconSrc(method: ShopPaymentMethodId): string {
  return SHOP_PAY_ICON[method];
}
