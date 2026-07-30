import {
  profileAvatarIconUrl,
  profileAvatarUrl,
} from "../../lib/profileAssets";
import {
  HEAD_ITEM_ICON_BY_ID,
  PROFILE_AVATAR_ROWS,
} from "./profileAvatarData.generated";

export type ProfileAvatar = {
  id: string;
  imageSrc: string;
};

/** ItemID display order (HeadPicData.Order). */
export const PROFILE_AVATAR_ITEM_ORDER: readonly number[] =
  PROFILE_AVATAR_ROWS.map((r) => r.itemId);

/** ItemData.Icon per row (parallel to PROFILE_AVATAR_ITEM_ORDER). */
export const PROFILE_AVATAR_ICONS: readonly string[] = PROFILE_AVATAR_ROWS.map(
  (r) => r.icon,
);

export const PROFILE_AVATAR_COUNT = PROFILE_AVATAR_ITEM_ORDER.length;

export const PROFILE_AVATARS: readonly ProfileAvatar[] =
  PROFILE_AVATAR_ROWS.map((row) => ({
    id: String(row.itemId),
    imageSrc: headSrcForIcon(row.icon),
  }));

const ITEM_ID_TO_ICON = new Map<number, string>(
  Object.entries(HEAD_ITEM_ICON_BY_ID).map(([id, icon]) => [
    Number(id),
    icon,
  ]),
);

const HEAD_PIC_ID_TO_ITEM_ID = new Map<number, number>(
  PROFILE_AVATAR_ROWS.map((row) => [row.headPicId, row.itemId]),
);

function isLegacyOneToTenId(id: string): boolean {
  return /^[1-9]$|^10$/.test(id);
}

function headSrcForIcon(icon: string): string {
  return profileAvatarIconUrl(icon);
}

/**
 * Normalize wire/local avatar id to canonical Item ID (401…).
 * Accepts Item ID, HeadPicData.ID (1…23), or legacy localStorage 1–10.
 */
export function itemIdFromAvatarWireId(
  id: string | number | null | undefined,
): number | undefined {
  if (id == null || id === "") return undefined;
  const n = Math.floor(Number(String(id).trim()));
  if (!Number.isFinite(n) || n < 1) return undefined;
  if (ITEM_ID_TO_ICON.has(n)) return n;
  const fromHeadPic = HEAD_PIC_ID_TO_ITEM_ID.get(n);
  if (fromHeadPic !== undefined) return fromHeadPic;
  return undefined;
}

/** Parse `avatarUrl` payloads like `414@@` or `401@@https://…`. */
export function itemIdFromAvatarUrlField(
  avatarUrl: string | null | undefined,
): number | undefined {
  const raw = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return undefined;
  const head = raw.split("@@")[0]?.trim() ?? "";
  if (!head) return undefined;
  return itemIdFromAvatarWireId(head);
}

/**
 * `backendAvatarId` 為登入／refresh 之 User.avatarId（Item ID 或 HeadPic ID）；
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
    const itemId = itemIdFromAvatarWireId(backendAvatarId);
    if (itemId !== undefined) return String(itemId);
    return String(Math.floor(backendAvatarId));
  }
  const t = storedId?.trim();
  if (!t) return undefined;
  const fromStored = itemIdFromAvatarWireId(t);
  if (fromStored !== undefined) return String(fromStored);
  if (isLegacyOneToTenId(t) || /^\d+$/.test(t)) return t;
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
  if (isLegacyOneToTenId(s)) {
    return { id: s, imageSrc: profileAvatarUrl(n) };
  }
  const itemId = itemIdFromAvatarWireId(s);
  if (itemId !== undefined) {
    const icon = ITEM_ID_TO_ICON.get(itemId);
    if (icon) {
      return { id: String(itemId), imageSrc: headSrcForIcon(icon) };
    }
  }
  return undefined;
}
