import { getSocureSdkKey } from "./socureSdkKey";

const SOCURE_DOCV_SCRIPT_URL = "https://websdk.socure.com/bundle.js";
const DEFAULT_CONTAINER_SELECTOR = "#socure-docv-root";

export type SocureDocvLaunchConfig = {
  onProgress?: (event: unknown) => void;
  onSuccess?: (response: unknown) => void;
  onError?: (error: unknown) => void;
  qrCodeNeeded?: boolean;
  disableSmsInput?: boolean;
  closeCaptureWindowOnComplete?: boolean;
  autoOpenTabOnMobile?: boolean;
};

export type SocureDocvLaunchResult =
  | { result: "success" }
  | { result: "error"; errorMessage: string };

type SocureDocvSdk = {
  launch: (
    sdkKey: string,
    docvTransactionToken: string,
    containerSelector: string,
    config?: SocureDocvLaunchConfig,
  ) => Promise<SocureDocvLaunchResult>;
  reset: () => void;
};

declare global {
  interface Window {
    SocureDocVSDK?: SocureDocvSdk;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

export function isSocureDocvEnabled(): boolean {
  return Boolean(getSocureSdkKey());
}

function loadSocureDocvScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("DocV SDK requires a browser environment"));
  }
  if (window.SocureDocVSDK) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-socure-docv-sdk="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load DocV SDK")),
        { once: true },
      );
      if (window.SocureDocVSDK) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = SOCURE_DOCV_SCRIPT_URL;
    script.async = true;
    script.dataset.socureDocvSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load DocV SDK"));
    document.head.appendChild(script);
  }).then(() => {
    if (!window.SocureDocVSDK) {
      throw new Error("DocV SDK failed to initialize");
    }
  });

  return scriptLoadPromise;
}

export async function launchSocureDocv(
  docvTransactionToken: string,
  callbacks: SocureDocvLaunchConfig = {},
  containerSelector: string = DEFAULT_CONTAINER_SELECTOR,
): Promise<SocureDocvLaunchResult> {
  const sdkKey = getSocureSdkKey();
  if (!sdkKey) {
    return {
      result: "error",
      errorMessage: "DocV SDK key is not configured",
    };
  }
  const token = docvTransactionToken.trim();
  if (!token) {
    return {
      result: "error",
      errorMessage: "Invalid DocV Transaction Token",
    };
  }

  await loadSocureDocvScript();
  const sdk = window.SocureDocVSDK;
  if (!sdk) {
    return { result: "error", errorMessage: "Failed to load websdk" };
  }

  const config: SocureDocvLaunchConfig = {
    onProgress: callbacks.onProgress ?? (() => {}),
    onSuccess: callbacks.onSuccess ?? (() => {}),
    onError: callbacks.onError ?? (() => {}),
    qrCodeNeeded: callbacks.qrCodeNeeded ?? true,
    disableSmsInput: callbacks.disableSmsInput ?? false,
    closeCaptureWindowOnComplete:
      callbacks.closeCaptureWindowOnComplete ?? true,
    autoOpenTabOnMobile: callbacks.autoOpenTabOnMobile ?? true,
  };

  return sdk.launch(sdkKey, token, containerSelector, config);
}

export function resetSocureDocv(): void {
  try {
    window.SocureDocVSDK?.reset();
  } catch {
    // Non-blocking cleanup.
  }
}

export const SOCURE_DOCV_CONTAINER_SELECTOR = DEFAULT_CONTAINER_SELECTOR;
