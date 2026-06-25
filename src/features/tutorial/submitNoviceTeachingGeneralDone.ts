import { GATEWAY_API_UPDATE_NOVICE_TEACHING } from "../../realtime/gatewayApi";
import { encodeUpdateNoviceTeachingRequest } from "../../realtime/noviceTeachingWire";
import type { GatewayWsRequestFn } from "../../realtime/gatewayWs";

/** 一般新手教學完成：noviceTeaching.general = 1 */
export async function submitNoviceTeachingGeneralDone(
  request: GatewayWsRequestFn,
  userId: string,
): Promise<boolean> {
  const trimmed = userId.trim();
  if (!trimmed || trimmed === "0") return false;

  const body = encodeUpdateNoviceTeachingRequest({
    userID: trimmed,
    noviceTeaching: { general: 1 },
  });
  const r = await request({
    type: GATEWAY_API_UPDATE_NOVICE_TEACHING,
    data: body,
    debugLabel: "UPDATE_NOVICE_TEACHING",
  });
  return String(r.code) === "200";
}
