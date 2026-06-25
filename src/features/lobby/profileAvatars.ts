import { profileAvatarUrl } from "../../lib/profileAssets";

export type ProfileAvatar = {
  id: string;
  imageSrc: string;
};

/** docs/profile.md 靜態表 ItemID 顯示順序（供頭像選擇排序） */
export const PROFILE_AVATAR_ITEM_ORDER: readonly number[] = [
  401, 406, 490, 491, 414, 494, 496, 495, 492, 438, 448, 487, 441, 485, 486,
  488, 489, 446, 419, 455, 497, 499,
];

/** 對應 `public/images/profile/avatars/head_{N}.png`（Order 欄；跳過 22） */
export const PROFILE_AVATAR_HEAD_INDEX: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  23,
];

export const PROFILE_AVATAR_COUNT = PROFILE_AVATAR_ITEM_ORDER.length;

export const PROFILE_AVATARS: readonly ProfileAvatar[] =
  PROFILE_AVATAR_ITEM_ORDER.map((itemId, i) => ({
    id: String(itemId),
    imageSrc: headSrcForIndex(PROFILE_AVATAR_HEAD_INDEX[i]!),
  }));

const ITEM_ID_TO_HEAD_INDEX = new Map<number, number>(
  PROFILE_AVATAR_ITEM_ORDER.map((itemId, i) => [
    itemId,
    PROFILE_AVATAR_HEAD_INDEX[i]!,
  ]),
);

function isLegacyOneToTenId(id: string): boolean {
  return /^[1-9]$|^10$/.test(id);
}

function headSrcForIndex(n: number): string {
  return profileAvatarUrl(n);
}

/**
 * `backendAvatarId` 為登入／refresh 之 User.avatarId（可為 Item ID 如 401）；
 * `storedId` 為 localStorage，僅在後端未給有效 id 時使用。
 */
export function effectiveAvatarId(
  backendAvatarId: number | undefined,
  storedId: string,
): string | undefined {
  if (
    backendAvatarId !== undefined &&
    Number.isFinite(backendAvatarId) &&
    backendAvatarId >= 1
  ) {
    return String(Math.floor(backendAvatarId));
  }
  const t = storedId?.trim();
  if (t && (isLegacyOneToTenId(t) || /^\d+$/.test(t))) return t;
  return undefined;
}

export function getProfileAvatarById(
  id: string | null | undefined,
): ProfileAvatar | undefined {
  if (id == null || id === "") return undefined;
  const s = String(id).trim();
  const fromList = PROFILE_AVATARS.find((a) => a.id === s);
  if (fromList) return fromList;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return undefined;
  const headIdx = ITEM_ID_TO_HEAD_INDEX.get(Math.floor(n));
  if (headIdx !== undefined) {
    return { id: s, imageSrc: headSrcForIndex(headIdx) };
  }
  if (isLegacyOneToTenId(s)) {
    return { id: s, imageSrc: headSrcForIndex(Number(s)) };
  }
  return undefined;
}
