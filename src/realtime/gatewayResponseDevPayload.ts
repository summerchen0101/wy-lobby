import {
  GATEWAY_API_ACTIVITY_COLLECT_REWARD,
  GATEWAY_API_BUY_PRODUCT,
  GATEWAY_API_CLAIM_REFERRAL_REWARD,
  GATEWAY_API_CREATE_WITHDRAW_ORDER,
  GATEWAY_API_AMOE_CREDITED_PUSH,
  GATEWAY_API_AMOE_INVALID_PUSH,
  GATEWAY_API_GENERATE_AMOE_CODE,
  GATEWAY_API_GET_ACTIVITY,
  GATEWAY_API_GET_PLAYER_INFO,
  GATEWAY_API_GET_REFERRAL_INFO,
  GATEWAY_API_GET_THIRD_PARTY_GAME_INFO,
  GATEWAY_API_GET_JACKPOT_INFO,
  GATEWAY_API_JACKPOT_INFO_PUSH,
  GATEWAY_API_LIST_PLAYER_AVATARS,
  GATEWAY_API_LIST_ACTIVITY,
  GATEWAY_API_LIST_PRODUCTS,
  GATEWAY_API_LIST_PURCHASE_AND_PRIZE_HISTORIES,
  GATEWAY_API_LIST_WITHDRAW_ORDERS,
  GATEWAY_API_LOBBY_GET,
  GATEWAY_API_MEGA_ACCOUNT_BINDING,
  GATEWAY_API_PING_PONG,
  GATEWAY_API_SEND_MESSAGE_PUSH,
  GATEWAY_API_SERVER_LOGIN,
  GATEWAY_API_SLOT_JACKPOT_PUSH,
  GATEWAY_API_USER_KICK_BEFORE,
  GATEWAY_API_UPDATE_PLAYER_AVATAR,
  GATEWAY_API_WALLET_GET,
  GATEWAY_API_WALLET_USE,
  GATEWAY_API_WITHDRAW_SUCCESS_PUSH,
} from "./gatewayApi";
import type { GatewayWsResponseObject } from "./gatewayWs";
import { hexPreview } from "./bytesHexPreview";
import {
  decodeSlotJackPotInfoToObjectForDev,
  decodeListJackPotRespToObjectForDev,
} from "./jackpotLobbyWire";
import { decodeLobbyGetResponseBytes } from "./lobbyDecode";
import {
  decodeBuyProductResponseBytes,
  decodeListProductsResponseBytes,
  decodeMegaAccountBindingResponseBytes,
  tryDecodeSendMessagePushToPaymentPush,
} from "./shopLobbyWire";
import { tryDecodeWalletUseRequestForDev } from "./walletLobbyWire";
import {
  decodeGetThirdPartyGameInfoResponseBytes,
  decodeListPlayerAvatarsResponseBytes,
  decodePlayerAvatarsInfoBytes,
} from "./playerAvatarWire";
import {
  decodeClaimReferralRewardRespBytes,
  decodeGetReferralInfoRespBytes,
} from "./referralLobbyWire";
import {
  decodeAmoeCreditedPushBytes,
  decodeAmoeInvalidPushBytes,
  decodeGenerateAmoeCodeResponseBytes,
} from "./amoeLobbyWire";
import {
  decodeCreateWithdrawOrderResponseBytes,
  decodeListWithdrawOrdersResponseBytes,
  decodeWithdrawSuccessPushBytes,
} from "./withdrawLobbyWire";
import { decodeListPurchaseAndPrizeHistoriesResponseBytes } from "./fundsHistoryLobbyWire";
import { decodeUserKickBeforeReasonBytes } from "./userKickWire";
import {
  decodeActivityCollectRewardRespBytes,
  decodeGetActivityResponseBytes,
  decodeListActivitiesResponseBytes,
} from "./activityLobbyWire";
import { decodeWalletGetResponseForDevLog } from "./walletGetLobbyWire";
import { decodeGetPlayerInfoResponseForDevLog } from "./playerInfoWire";

const HEX_MAX = 48;

type DataDecodedResult =
  | { kind: string; [key: string]: unknown }
  | { decodeError: string; hexPreview: string; kind: "fallback" };

function fallbackHex(raw: Uint8Array, err: unknown): DataDecodedResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    kind: "fallback",
    decodeError: message,
    hexPreview: hexPreview(raw, HEX_MAX),
  };
}

/**
 * 將 `gateway.Response` 的 `data` 依 `type` 轉成可讀摘要（專供 dev log）。
 * 不拋出例外。
 */
export function decodeGatewayResponseDataForDevLog(
  type: number,
  code: string,
  raw: Uint8Array,
): DataDecodedResult {
  const empty = raw.byteLength === 0;
  if (type === GATEWAY_API_PING_PONG) {
    if (empty) {
      return { kind: "PING_PONG", note: "empty" };
    }
    return { kind: "PING_PONG", unexpectedBytes: raw.byteLength };
  }
  if (type === GATEWAY_API_SERVER_LOGIN) {
    if (empty) {
      return { kind: "SERVER_LOGIN", note: "empty" };
    }
    return {
      kind: "SERVER_LOGIN",
      unexpectedBytes: raw.byteLength,
      hexPreview: hexPreview(raw, HEX_MAX),
    };
  }
  if (type === GATEWAY_API_USER_KICK_BEFORE) {
    if (empty) {
      return { kind: "USER_KICK_BEFORE", note: "empty body" };
    }
    const decoded = decodeUserKickBeforeReasonBytes(raw);
    if (decoded) {
      return { kind: "USER_KICK_BEFORE", reason: decoded.reason };
    }
    return {
      kind: "USER_KICK_BEFORE",
      decodeNote: "failed",
      hexPreview: hexPreview(raw, HEX_MAX),
    };
  }
  if (code === "204" && empty) {
    return { kind: "noBody", code: "204" };
  }
  if (empty) {
    return { kind: "empty", type };
  }

  try {
    if (type === GATEWAY_API_LOBBY_GET) {
      const decoded = decodeLobbyGetResponseBytes(raw);
      return {
        kind: "LOBBY_GET",
        data: decoded,
      };
    }
    if (
      type === GATEWAY_API_SLOT_JACKPOT_PUSH ||
      type === GATEWAY_API_JACKPOT_INFO_PUSH ||
      type === GATEWAY_API_GET_JACKPOT_INFO
    ) {
      if (type === GATEWAY_API_GET_JACKPOT_INFO) {
        const list = decodeListJackPotRespToObjectForDev(raw);
        if (list && list.infoCount > 0) {
          return {
            kind: "LIST_JACKPOT",
            list,
          };
        }
        return fallbackHex(
          raw,
          new Error("ListJackPotResp decode empty or failed"),
        );
      }
      const listForPush = decodeListJackPotRespToObjectForDev(raw);
      if (listForPush && listForPush.infoCount > 0) {
        return {
          kind: "LIST_JACKPOT",
          list: listForPush,
        };
      }
      const slot = decodeSlotJackPotInfoToObjectForDev(raw);
      if (slot && slot.jackpotAmounts.length > 0) {
        return { kind: "SLOT_JACKPOT", slot };
      }
      return fallbackHex(raw, new Error("jackpot wire decode failed"));
    }
    if (type === GATEWAY_API_WALLET_GET) {
      try {
        const data = decodeWalletGetResponseForDevLog(raw);
        return { kind: "WALLET_GET", data };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_GET_PLAYER_INFO) {
      try {
        const data = decodeGetPlayerInfoResponseForDevLog(raw);
        return { kind: "GET_PLAYER_INFO", data };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_WALLET_USE) {
      const w = tryDecodeWalletUseRequestForDev(raw);
      if (w) {
        return { kind: "WALLET_USE", wallet: w };
      }
      return {
        kind: "WALLET_USE",
        note: "body not decodable as WalletUseRequest; hex only",
        hexPreview: hexPreview(raw, HEX_MAX),
      };
    }
    if (type === GATEWAY_API_LIST_PRODUCTS) {
      try {
        const { products } = decodeListProductsResponseBytes(raw);
        return {
          kind: "LIST_PRODUCTS",
          productCount: products.length,
          productIdsPreview: products.slice(0, 8).map((p) => p.productID),
          productsPaymentTypesPreview: products.slice(0, 6).map((p) => ({
            productID: p.productID,
            paymentTypes: p.paymentTypes,
          })),
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_BUY_PRODUCT) {
      try {
        const { orderID, paymentURL } = decodeBuyProductResponseBytes(raw);
        return {
          kind: "BUY_PRODUCT",
          orderID,
          paymentURLPreview:
            paymentURL.length > 80 ? `${paymentURL.slice(0, 80)}…` : paymentURL,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_MEGA_ACCOUNT_BINDING) {
      try {
        const { phoneNum, needSMSAnswer, docvTransactionToken } =
          decodeMegaAccountBindingResponseBytes(raw);
        return {
          kind: "MEGA_ACCOUNT_BINDING",
          phoneNum,
          needSMSAnswer,
          docvTransactionToken: docvTransactionToken
            ? `${docvTransactionToken.slice(0, 8)}…`
            : "",
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_LIST_PLAYER_AVATARS) {
      try {
        const { avatarsInfo } = decodeListPlayerAvatarsResponseBytes(raw);
        return {
          kind: "LIST_PLAYER_AVATARS",
          avatarCount: avatarsInfo?.length ?? 0,
          avatarsInfo,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_UPDATE_PLAYER_AVATAR) {
      try {
        const row =
          raw.byteLength > 0 ? decodePlayerAvatarsInfoBytes(raw) : undefined;
        return {
          kind: "UPDATE_PLAYER_AVATAR",
          avatarID: row?.avatarID,
          goodState: row?.goodState,
          byteLength: raw.byteLength,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_GET_THIRD_PARTY_GAME_INFO) {
      try {
        const { thirdPartyGameInfo } =
          decodeGetThirdPartyGameInfoResponseBytes(raw);
        const url = thirdPartyGameInfo?.gameLaunchURL?.trim() ?? "";
        return {
          kind: "GET_THIRD_PARTY_GAME_INFO",
          hasLaunchURL: Boolean(url),
          url,
          platform: thirdPartyGameInfo?.platform,
          gameUID: thirdPartyGameInfo?.gameUID,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_SEND_MESSAGE_PUSH) {
      const pay = tryDecodeSendMessagePushToPaymentPush(type, raw);
      if (pay) {
        return { kind: "SEND_MESSAGE_PUSH", paymentFinishPush: pay };
      }
      return {
        kind: "SEND_MESSAGE_PUSH",
        note: "not PaymentFinishPush(1013) or inner decode failed",
        hexPreview: hexPreview(raw, HEX_MAX),
      };
    }
    if (type === GATEWAY_API_LIST_WITHDRAW_ORDERS) {
      try {
        const decoded = decodeListWithdrawOrdersResponseBytes(raw);
        return {
          kind: "LIST_WITHDRAW_ORDERS",
          data: decoded,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_LIST_PURCHASE_AND_PRIZE_HISTORIES) {
      try {
        const decoded = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
        return {
          kind: "LIST_PURCHASE_AND_PRIZE_HISTORIES",
          data: decoded,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_CREATE_WITHDRAW_ORDER) {
      try {
        const { withdrawOrderUID } =
          decodeCreateWithdrawOrderResponseBytes(raw);
        return {
          kind: "CREATE_WITHDRAW_ORDER",
          withdrawOrderUID,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_WITHDRAW_SUCCESS_PUSH) {
      try {
        const p = decodeWithdrawSuccessPushBytes(raw);
        if (p) {
          return {
            kind: "WITHDRAW_SUCCESS_PUSH",
            userID: p.userID,
            nickname: p.nickname,
            actualAmountWire: p.actualAmountWire,
          };
        }
        return fallbackHex(raw, new Error("WithdrawSuccessPush decode failed"));
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_LIST_ACTIVITY) {
      try {
        const { activities } = decodeListActivitiesResponseBytes(raw);
        return {
          kind: "LIST_ACTIVITY",
          activityCount: activities?.length ?? 0,
          activityTypesPreview: (activities ?? [])
            .slice(0, 6)
            .map((a) => a.activityType),
          activities,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_GET_ACTIVITY) {
      try {
        const { activity } = decodeGetActivityResponseBytes(raw);
        return {
          kind: "GET_ACTIVITY",
          activityID: activity?.activityID,
          activityType: activity?.activityType,
          missionDateCount: Object.keys(
            activity?.UserDailyMissionsByDates ?? {},
          ).length,
          creditRewardCount: activity?.dailyMissionCreditRewards?.length ?? 0,
          activity,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_ACTIVITY_COLLECT_REWARD) {
      try {
        decodeActivityCollectRewardRespBytes(raw);
        return { kind: "ACTIVITY_COLLECT_REWARD", note: "empty body" };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_GET_REFERRAL_INFO) {
      try {
        const d = decodeGetReferralInfoRespBytes(raw);
        return {
          kind: "GET_REFERRAL_INFO",
          registerReferredCnt: d.registerReferredCnt,
          qualifiedReferredCnt: d.qualifiedReferredCnt,
          hasCode: Boolean(d.myReferrerCode?.value?.trim()),
          rewardCount: d.referralInfo?.rewards?.length ?? 0,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_CLAIM_REFERRAL_REWARD) {
      try {
        const { rewards } = decodeClaimReferralRewardRespBytes(raw);
        return {
          kind: "CLAIM_REFERRAL_REWARD",
          rewardCount: rewards?.length ?? 0,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_GENERATE_AMOE_CODE) {
      try {
        const d = decodeGenerateAmoeCodeResponseBytes(raw);
        return {
          kind: "GENERATE_AMOE_CODE",
          entryId: d.entryId,
          sweepstakeCode: d.sweepstakeCode,
        };
      } catch (e) {
        return fallbackHex(raw, e);
      }
    }
    if (type === GATEWAY_API_AMOE_CREDITED_PUSH) {
      const p = decodeAmoeCreditedPushBytes(raw);
      if (p) {
        return {
          kind: "AMOE_CREDITED_PUSH",
          entryId: p.entryId,
          scAmountWire: p.scAmountWire,
          sweepstakeCode: p.sweepstakeCode,
        };
      }
      return fallbackHex(raw, new Error("AmoeCreditedPush decode failed"));
    }
    if (type === GATEWAY_API_AMOE_INVALID_PUSH) {
      const p = decodeAmoeInvalidPushBytes(raw);
      if (p) {
        return {
          kind: "AMOE_INVALID_PUSH",
          entryId: p.entryId,
          sweepstakeCode: p.sweepstakeCode,
          exceptionCodes: p.exceptionCodes,
        };
      }
      return fallbackHex(raw, new Error("AmoeInvalidPush decode failed"));
    }
  } catch (e) {
    return fallbackHex(raw, e);
  }

  return {
    kind: "unknownType",
    type,
    hexPreview: hexPreview(raw, HEX_MAX),
  };
}

/**
 * 組合 dev 專用的一列 `gateway-ws` 回應物件，不含 `data` 原始 `Uint8Array`。
 */
export function formatGatewayResponseForDevLog(msg: GatewayWsResponseObject) {
  const m = msg as {
    type?: number | string;
    code?: string;
    errMessage?: string;
    data?: unknown;
  };
  const type = Number(m.type);
  const code = String(m.code ?? "");
  const data = m.data;
  const dataByteLength = data instanceof Uint8Array ? data.byteLength : 0;
  const raw = data instanceof Uint8Array ? data : new Uint8Array(0);
  const dataDecoded = decodeGatewayResponseDataForDevLog(type, code, raw);
  return {
    type,
    code,
    errMessage: m.errMessage,
    dataByteLength,
    dataDecoded,
  };
}
