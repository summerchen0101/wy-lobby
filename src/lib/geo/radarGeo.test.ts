import { describe, expect, it } from "vitest";
import {
  mapRadarErrorStatus,
  mapVerificationResult,
} from "./radarGeo";

describe("mapVerificationResult", () => {
  it("returns allowed when passed is true", () => {
    expect(
      mapVerificationResult({ passed: true, token: "jwt", failureReasons: [] }),
    ).toEqual({ status: "allowed", token: "jwt" });
  });

  it("returns proxy when fraud.proxy is true", () => {
    expect(
      mapVerificationResult({
        passed: false,
        failureReasons: [],
        user: { _id: "u1", fraud: { passed: false, bypassed: false, verified: false, proxy: true, mocked: false, compromised: false, jumped: false, sharing: false } },
      }),
    ).toEqual({ status: "blocked", blockReason: "proxy" });
  });

  it("returns region when country.passed is false", () => {
    expect(
      mapVerificationResult({
        passed: false,
        failureReasons: [],
        user: {
          _id: "u1",
          country: { _id: "c1", type: "country", code: "TW", name: "Taiwan", passed: false },
        },
      }),
    ).toEqual({ status: "blocked", blockReason: "region" });
  });

  it("returns region when state.passed is false", () => {
    expect(
      mapVerificationResult({
        passed: false,
        failureReasons: [],
        user: {
          _id: "u1",
          state: { _id: "s1", type: "state", code: "CA", name: "California", passed: false },
        },
      }),
    ).toEqual({ status: "blocked", blockReason: "region" });
  });

  it("returns region when failureReasons mention jurisdiction", () => {
    expect(
      mapVerificationResult({
        passed: false,
        failureReasons: ["jurisdiction_not_allowed"],
        user: { _id: "u1" },
      }),
    ).toEqual({ status: "blocked", blockReason: "region" });
  });

  it("defaults to region when passed is false without specific reason", () => {
    expect(
      mapVerificationResult({
        passed: false,
        failureReasons: [],
        user: { _id: "u1" },
      }),
    ).toEqual({ status: "blocked", blockReason: "region" });
  });
});

describe("mapRadarErrorStatus", () => {
  it("maps SDK error statuses", () => {
    expect(mapRadarErrorStatus("ERROR_PERMISSIONS")).toBe("permissions");
    expect(mapRadarErrorStatus("ERROR_NETWORK")).toBe("network");
    expect(mapRadarErrorStatus("ERROR_LOCATION")).toBe("location");
    expect(mapRadarErrorStatus("ERROR_UNKNOWN")).toBe("unknown");
  });
});
