/**
 * `app_meta` 對齊產品規格：Web 客戶端 `apk` 為 `web`（對應舊 megarich_web）；另含 `device_type`、`version`、`device`、`resolution`。
 * `device` 可含平台與 user agent（如 iOS Safari 字串）。
 */
const DEVICE_ID_KEY = "luklok_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateWebDeviceId(): string {
  if (typeof localStorage === "undefined") return randomId();
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function resolutionBucket(): "High" | "Medium" | "Low" {
  if (typeof window === "undefined") return "High";
  const w = window.screen?.width ?? 0;
  if (w >= 1200) return "High";
  if (w >= 768) return "Medium";
  return "Low";
}

/** 登入／註冊 `app_meta.device_type`：由瀏覽器環境推斷。 */
export type AppDeviceType = "ios" | "android" | "pc";

export function detectDeviceType(): AppDeviceType {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/iPad/i.test(ua)) return "ios";
  // iPadOS 13+ Safari often reports Macintosh + touch
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  return "pc";
}

export type AppMetaPayload = {
  apk: string;
  version: string;
  device: string;
  device_type: AppDeviceType;
  resolution: "High" | "Medium" | "Low" | string;
};

/**
 * 登入／註冊共用的 `app_meta` 物件（扁平欄位，無額外包一層），後端若要求 JSON 字串可在外層 `JSON.stringify`。
 */
export function buildAppMetaPayload(): AppMetaPayload {
  const version =
    (import.meta.env.VITE_APP_VERSION ?? "0000").toString() || "0000";
  let device = "web";
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    const uad = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    const platform = typeof uad?.platform === "string" ? uad.platform : "";
    const parts = [platform, ua].filter(Boolean);
    device = parts.join(" ").trim() || "web";
  }
  return {
    apk: "web",
    version,
    device,
    device_type: detectDeviceType(),
    resolution: resolutionBucket(),
  };
}

export const LOGIN_V1_TYPE = 1;

export function nicknameFromEmail(email: string): string {
  const i = email.indexOf("@");
  return (i > 0 ? email.slice(0, i) : email).trim() || email;
}
