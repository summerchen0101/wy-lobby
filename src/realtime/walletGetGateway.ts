import { getDevBeggarEnvelopeSubsidyAmount } from "../lib/beggarEnvelopeDevMock";
import { getDevRedeemApprovalAmountsWire } from "../lib/redeemApprovalDevMock";
import { getDevVipLevelBonusList } from "../lib/vipLevelUpDevMock";
import { GATEWAY_API_WALLET_GET } from "./gatewayApi";
import { isGatewaySuccessCode } from "./gatewayWire";
import type { GatewayWsRequestFn } from "./gatewayWs";
import {
  decodeWalletGetResponseBytes,
  encodeWalletGetRequestBytes,
  parseRedeemSCList,
  parseSubsidyAmount,
  parseVipLevelBonusList,
  type VipLevelBonusItem,
} from "./walletGetLobbyWire";

export type WalletGetLobbyExtras = {
  subsidyAmount: number;
  vipLevelBonusList: VipLevelBonusItem[];
  redeemSCList: string[];
};

const EMPTY_EXTRAS: WalletGetLobbyExtras = {
  subsidyAmount: 0,
  vipLevelBonusList: [],
  redeemSCList: [],
};

let inFlight: Promise<WalletGetLobbyExtras> | null = null;
let cachedExtras: WalletGetLobbyExtras | null = null;
let cachedAtMs = 0;

/** Coalesce duplicate lobby checks during login bootstrap (StrictMode / hydration). */
const COALESCE_MS = 2_000;

function applyDevMockOverrides(extras: WalletGetLobbyExtras): WalletGetLobbyExtras {
  const subsidyDev = getDevBeggarEnvelopeSubsidyAmount();
  const vipDev = getDevVipLevelBonusList();
  const redeemDev = getDevRedeemApprovalAmountsWire();
  return {
    subsidyAmount: subsidyDev ?? extras.subsidyAmount,
    vipLevelBonusList: vipDev ?? extras.vipLevelBonusList,
    redeemSCList: redeemDev ?? extras.redeemSCList,
  };
}

function extrasFullyMocked(): WalletGetLobbyExtras | null {
  const subsidyDev = getDevBeggarEnvelopeSubsidyAmount();
  const vipDev = getDevVipLevelBonusList();
  const redeemDev = getDevRedeemApprovalAmountsWire();
  if (subsidyDev === null || vipDev === null || redeemDev === null) {
    return null;
  }
  return {
    subsidyAmount: subsidyDev,
    vipLevelBonusList: vipDev,
    redeemSCList: redeemDev,
  };
}

function parseExtrasFromResponse(data: Uint8Array): WalletGetLobbyExtras {
  const decoded = decodeWalletGetResponseBytes(data);
  return {
    subsidyAmount: parseSubsidyAmount(decoded.subsidyAmount),
    vipLevelBonusList: parseVipLevelBonusList(decoded.vipLevelBonusList),
    redeemSCList: parseRedeemSCList(decoded.redeemSCList),
  };
}

export function clearWalletGetLobbyExtrasCacheForTests(): void {
  inFlight = null;
  cachedExtras = null;
  cachedAtMs = 0;
}

/**
 * Single WALLET_GET (12) for lobby extras: subsidy, VIP bonuses, redeem approvals.
 * Uses GC walletType; notification fields are independent of active wallet.
 * Dev env mocks override individual fields after the API call (unless all three are mocked).
 */
export async function fetchWalletGetLobbyExtras(
  request: GatewayWsRequestFn,
  options?: { force?: boolean },
): Promise<WalletGetLobbyExtras> {
  const fullyMocked = extrasFullyMocked();
  if (fullyMocked !== null) return fullyMocked;

  const force = options?.force ?? false;
  const now = Date.now();
  if (!force && cachedExtras !== null && now - cachedAtMs < COALESCE_MS) {
    return applyDevMockOverrides(cachedExtras);
  }

  if (!force && inFlight) {
    return inFlight.then(applyDevMockOverrides);
  }

  inFlight = (async () => {
    const r = await request({
      type: GATEWAY_API_WALLET_GET,
      data: encodeWalletGetRequestBytes("GC"),
      debugLabel: "WALLET_GET_LOBBY",
    });
    const code = String(r.code ?? "");
    if (!isGatewaySuccessCode(code) || !(r.data instanceof Uint8Array)) {
      return EMPTY_EXTRAS;
    }
    const extras = parseExtrasFromResponse(r.data);
    cachedExtras = extras;
    cachedAtMs = Date.now();
    return extras;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight.then(applyDevMockOverrides);
}
