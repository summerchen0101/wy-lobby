import { describe, expect, it } from "vitest";
import {
  getProfileAvatarById,
  itemIdFromAvatarUrlField,
  itemIdFromAvatarWireId,
  PROFILE_AVATAR_ICONS,
  PROFILE_AVATAR_ITEM_ORDER,
} from "./profileAvatars";

describe("getProfileAvatarById", () => {
  it("maps ItemID 401 to ItemData Icon head_1", () => {
    const avatar = getProfileAvatarById("401");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_1.png");
  });

  it("maps ItemID 499 to ItemData Icon head_24", () => {
    const avatar = getProfileAvatarById("499");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_24.png");
  });

  it("maps HeadPic ID 15 (Item 490) to ItemData Icon head_15", () => {
    const avatar = getProfileAvatarById("15");
    expect(avatar?.id).toBe("490");
    expect(avatar?.imageSrc).toContain("/images/profile/avatars/head_15.png");
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

  it("aligns item order with icon table from ItemData", () => {
    expect(PROFILE_AVATAR_ITEM_ORDER.length).toBe(PROFILE_AVATAR_ICONS.length);
    expect(PROFILE_AVATAR_ITEM_ORDER.at(-1)).toBe(499);
    expect(PROFILE_AVATAR_ICONS.at(-1)).toBe("head_24");
  });
});

describe("itemIdFromAvatarWireId", () => {
  it("accepts Item ID and HeadPic ID", () => {
    expect(itemIdFromAvatarWireId(401)).toBe(401);
    expect(itemIdFromAvatarWireId(15)).toBe(490);
  });
});

describe("itemIdFromAvatarUrlField", () => {
  it("parses item id from avatarUrl prefix", () => {
    expect(itemIdFromAvatarUrlField("414@@")).toBe(414);
    expect(itemIdFromAvatarUrlField("490@@https://fb.com/pic")).toBe(490);
  });
});
