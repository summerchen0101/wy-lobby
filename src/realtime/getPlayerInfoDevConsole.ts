/**
 * Dev-only：`await __ffgtGetPlayerInfo()` 觸發 Gateway type 20。
 * 獨立模組 + 每次 bind 覆寫 window，避免 HMR 留下舊 closure。
 */
import { GATEWAY_API_GET_PLAYER_INFO } from "./gatewayApi";
import type { GatewayWsRequestFn } from "./gatewayWs";
import {
  decodeGetPlayerInfoResponseBytes,
  encodeGetPlayerInfoRequestBytes,
} from "./playerInfoWire";

const HELPER_VERSION = "v5-module-bind";

type DevApi = {
  __ffgtGetPlayerInfo?: (userID?: string) => Promise<unknown>;
  __ffgtGetPlayerInfoVersion?: string;
  __ffgtGatewayRequestRef?: { current: GatewayWsRequestFn | null };
  __ffgtDevUserId?: string;
};

function getWin(): DevApi | null {
  if (typeof window === "undefined") return null;
  return window as unknown as DevApi;
}

// 模組載入時清掉非 v5 的殘留 helper（HMR 常見）
if (import.meta.env.DEV) {
  const w = getWin();
  if (w && w.__ffgtGetPlayerInfoVersion !== HELPER_VERSION) {
    delete w.__ffgtGetPlayerInfo;
    delete w.__ffgtGetPlayerInfoVersion;
  }
}

let loggedInstall = false;

export function bindGetPlayerInfoDevConsole(params: {
  requestRef: { current: GatewayWsRequestFn | null };
  userId?: string | null;
}): void {
  if (!import.meta.env.DEV) return;
  const w = getWin();
  if (!w) return;

  w.__ffgtGatewayRequestRef = params.requestRef;
  w.__ffgtDevUserId = params.userId?.trim() || "";

  // 強制覆寫：HMR 常留下無 version 的舊 __ffgtGetPlayerInfo
  w.__ffgtGetPlayerInfoVersion = HELPER_VERSION;
  w.__ffgtGetPlayerInfo = async (userID?: string) => {
    try {
      const request = w.__ffgtGatewayRequestRef?.current;
      if (!request) {
        console.warn("[GET_PLAYER_INFO] gateway request not ready");
        return null;
      }
      const uid = String(userID ?? w.__ffgtDevUserId ?? "").trim();
      if (!uid || !/^\d+$/.test(uid)) {
        console.warn(`[GET_PLAYER_INFO] bad userID: ${uid || "(empty)"}`);
        return null;
      }

      const r = await request({
        type: GATEWAY_API_GET_PLAYER_INFO,
        data: encodeGetPlayerInfoRequestBytes(uid),
        debugLabel: "GET_PLAYER_INFO_CONSOLE",
      });
      const raw = r.data instanceof Uint8Array ? r.data : new Uint8Array(0);
      let decoded: ReturnType<typeof decodeGetPlayerInfoResponseBytes> | null =
        null;
      let decodeError: string | undefined;
      try {
        decoded = raw.byteLength
          ? decodeGetPlayerInfoResponseBytes(raw)
          : null;
      } catch (e) {
        decodeError = e instanceof Error ? e.message : String(e);
      }
      const playerInfo =
        decoded?.playerInfo && typeof decoded.playerInfo === "object"
          ? decoded.playerInfo
          : null;
      const out = {
        helper: HELPER_VERSION,
        userID: uid,
        type: r.type,
        code: r.code,
        errMessage: r.errMessage,
        dataByteLength: raw.byteLength,
        decodeError,
        playerInfoKeys: playerInfo ? Object.keys(playerInfo) : [],
        frontImageLen:
          typeof playerInfo?.frontImage === "string"
            ? playerInfo.frontImage.length
            : 0,
        socialIDPic1Len:
          typeof playerInfo?.socialIDPic1 === "string"
            ? playerInfo.socialIDPic1.length
            : 0,
        decoded,
      };
      console.info("[GET_PLAYER_INFO console]", out);
      return out;
    } catch (e) {
      console.warn("[GET_PLAYER_INFO] request failed", e);
      return null;
    }
  };

  if (!loggedInstall) {
    loggedInstall = true;
    console.info(
      `[GET_PLAYER_INFO] helper ${HELPER_VERSION} ready — check __ffgtGetPlayerInfoVersion then await __ffgtGetPlayerInfo()`,
    );
  }
}
