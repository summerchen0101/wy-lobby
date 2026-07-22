import {
  clearBeggarEnvelopeShownForTests,
  markPendingBeggarEnvelopeCheck,
} from "./beggarEnvelopeCheck";

export const BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT = "ffgt:beggar-envelope:dev-preview";

const DEFAULT_DEV_SUBSIDY = 100_000;

/** Dev-only: `VITE_DEV_WALLET_GET_SUBSIDY` 設為正整數時，略過真實 WALLET_GET。 */
export function getDevBeggarEnvelopeSubsidyAmount(): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = (import.meta.env.VITE_DEV_WALLET_GET_SUBSIDY ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function isBeggarEnvelopeDevMockEnabled(): boolean {
  return getDevBeggarEnvelopeSubsidyAmount() !== null;
}

export function dispatchBeggarEnvelopeDevPreview(amount: number): void {
  window.dispatchEvent(
    new CustomEvent(BEGGAR_ENVELOPE_DEV_PREVIEW_EVENT, {
      detail: { amount },
    }),
  );
}

export type BeggarEnvelopeDevApi = {
  /** 模擬從遊戲回到大廳（走 Gate 完整流程，需已登入且在大廳 `/`） */
  trigger: () => void;
  /** 直接開啟乞丐紅包視窗（略過遊戲返回與 WALLET_GET） */
  preview: (amount?: number) => void;
  /** 清除 session dedup，可再次彈窗 */
  reset: () => void;
  /** 目前 mock 設定的補貼額度（未設 env 時為 null） */
  mockAmount: () => number | null;
};

declare global {
  interface Window {
    __ffgtDevBeggarEnvelope?: BeggarEnvelopeDevApi;
  }
}

export function installBeggarEnvelopeDevMock(): void {
  if (!import.meta.env.DEV) return;

  const api: BeggarEnvelopeDevApi = {
    trigger: () => {
      markPendingBeggarEnvelopeCheck();
      console.info(
        "[dev][beggar-envelope] trigger() — 已標記「回到大廳」；請確認在大廳 `/` 且已登入。",
      );
    },
    preview: (amount = getDevBeggarEnvelopeSubsidyAmount() ?? DEFAULT_DEV_SUBSIDY) => {
      const n = Math.floor(amount);
      if (!Number.isFinite(n) || n <= 0) {
        console.warn("[dev][beggar-envelope] preview() 需要正整數 amount");
        return;
      }
      dispatchBeggarEnvelopeDevPreview(n);
      console.info(`[dev][beggar-envelope] preview(${n})`);
    },
    reset: () => {
      clearBeggarEnvelopeShownForTests();
      console.info("[dev][beggar-envelope] reset() — 已清除 shown / pending 旗標");
    },
    mockAmount: () => getDevBeggarEnvelopeSubsidyAmount(),
  };

  window.__ffgtDevBeggarEnvelope = api;
}
