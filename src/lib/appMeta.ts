/**
 * `app_meta` 對齊產品規格：`apk`（通路 `ios`／`web`／`google`）、`version`、`device`、`device_type`、`resolution`。
 * `device` 可含平台與 user agent；`device_type` 為粗分類（後台 `deviceType`：`ios`／`android`／`pc`）。
 */
const DEVICE_ID_KEY = "wynoco_device_id";

/** 登入 `app_meta.apk`（新值）；對應舊版 megarich／megarich_web／megarich_google。 */
export type AppMetaApkChannel = "ios" | "web" | "google";

export type AppMetaDeviceType = "ios" | "android" | "pc";

const LEGACY_APK_TO_CHANNEL: Record<string, AppMetaApkChannel> = {
  megarich: "ios",
  megarich_web: "web",
  megarich_google: "google",
};

/**
 * 將 env 或舊版 apk 字串正規化為 `ios` | `web` | `google`。
 * 空字串時：**本 Web 大廳預設 `web`**。
 */
export function normalizeAppMetaApk(raw: string | undefined): AppMetaApkChannel {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "ios" || t === "web" || t === "google") return t;
  const mapped = LEGACY_APK_TO_CHANNEL[t];
  if (mapped) return mapped;
  return "web";
}

/**
 * 依 UA／navigator 推導 `app_meta.device_type`（與後台 player `deviceType`：ios／android／pc 對齊）。
 * 純函式，便於單元測試。
 */
export function deviceTypeFromUserAgent(
  ua: string,
  opts?: { platform?: string; maxTouchPoints?: number },
): AppMetaDeviceType {
  const platform = opts?.platform ?? "";
  const touch = opts?.maxTouchPoints ?? 0;
  // iPadOS 13+ Safari 常回報 desktop Macintosh + 多點觸控
  if (
    platform === "MacIntel" &&
    touch > 1 &&
    !/iPhone|iPad|iPod/i.test(ua)
  ) {
    return "ios";
  }
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "pc";
}

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

export type AppMetaPayload = {
  apk: AppMetaApkChannel;
  version: string;
  device: string;
  /** 後台列表／詳情之 `deviceType`（ios／android／pc） */
  device_type: AppMetaDeviceType;
  resolution: "High" | "Medium" | "Low" | string;
};

/**
 * 登入／註冊共用的 `app_meta` 物件（扁平欄位，無額外包一層），後端若要求 JSON 字串可在外層 `JSON.stringify`。
 */
export function buildAppMetaPayload(): AppMetaPayload {
  const version =
    (import.meta.env.VITE_APP_VERSION ?? "0000").toString() || "0000";
  const apk = normalizeAppMetaApk(import.meta.env.VITE_APP_META_APK);
  let device = "web";
  let device_type: AppMetaDeviceType = "pc";
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    const uad = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    const platformHint =
      typeof uad?.platform === "string"
        ? uad.platform
        : typeof navigator.platform === "string"
          ? navigator.platform
          : "";
    const parts = [platformHint, ua].filter(Boolean);
    device = parts.join(" ").trim() || "web";
    device_type = deviceTypeFromUserAgent(ua, {
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  }
  return {
    apk,
    version,
    device,
    device_type,
    resolution: resolutionBucket(),
  };
}

export const LOGIN_V1_TYPE = 1;

export function nicknameFromEmail(email: string): string {
  const i = email.indexOf("@");
  return (i > 0 ? email.slice(0, i) : email).trim() || email;
}
