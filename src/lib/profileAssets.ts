import { publicImageUrl } from "./publicImageUrl";

const PROFILE = publicImageUrl("/images/profile");
const AVATARS = `${PROFILE}/avatars`;
const VIP = `${PROFILE}/vip`;

export const PROFILE_VIP_MIN_LEVEL = 0;
export const PROFILE_VIP_MAX_LEVEL = 15;

export function profileAvatarUrl(headIndex: number): string {
  return `${AVATARS}/head_${Math.floor(headIndex)}.png`;
}

export function profileAvatarFrameUrl(selected = false): string {
  return selected
    ? `${AVATARS}/head_frame_sel.png`
    : `${AVATARS}/head_frame.png`;
}

export function profileVipBadgeUrl(vipLevel: number): string {
  const level = Math.min(
    PROFILE_VIP_MAX_LEVEL,
    Math.max(PROFILE_VIP_MIN_LEVEL, Math.floor(vipLevel)),
  );
  return `${VIP}/lv${level}.png`;
}

export const PROFILE_VIP_CLAIMED_STAMP_URL = `${VIP}/img_claimed.png`;
