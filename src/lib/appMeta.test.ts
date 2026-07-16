import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAppMetaForAuthRequest } from "./appMeta";

describe("buildAppMetaForAuthRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults apk to web", () => {
    expect(buildAppMetaForAuthRequest().apk).toBe("web");
  });

  it("uses VITE_APP_META_APK when set", () => {
    vi.stubEnv("VITE_APP_META_APK", "megarich_web");
    expect(buildAppMetaForAuthRequest().apk).toBe("megarich_web");
  });

  it("falls back to web when VITE_APP_META_APK is blank", () => {
    vi.stubEnv("VITE_APP_META_APK", "   ");
    expect(buildAppMetaForAuthRequest().apk).toBe("web");
  });
});
