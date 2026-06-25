import { describe, expect, it } from "vitest";
import {
  getProfileAvatarById,
  PROFILE_AVATAR_HEAD_INDEX,
  PROFILE_AVATAR_ITEM_ORDER,
} from "./profileAvatars";

describe("getProfileAvatarById", () => {
  it("maps ItemID 401 to head_1", () => {
    const avatar = getProfileAvatarById("401");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_1.png");
  });

  it("maps ItemID 499 to head_23 (Order skips 22)", () => {
    const avatar = getProfileAvatarById("499");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_23.png");
  });

  it("maps legacy id 5 to head_5", () => {
    const avatar = getProfileAvatarById("5");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_5.png");
  });

  it("returns undefined for invalid ids", () => {
    expect(getProfileAvatarById("")).toBeUndefined();
    expect(getProfileAvatarById("abc")).toBeUndefined();
    expect(getProfileAvatarById("99999")).toBeUndefined();
  });

  it("aligns item order with head index table", () => {
    expect(PROFILE_AVATAR_ITEM_ORDER.length).toBe(
      PROFILE_AVATAR_HEAD_INDEX.length,
    );
    expect(PROFILE_AVATAR_ITEM_ORDER.at(-1)).toBe(499);
    expect(PROFILE_AVATAR_HEAD_INDEX.at(-1)).toBe(23);
  });
});
