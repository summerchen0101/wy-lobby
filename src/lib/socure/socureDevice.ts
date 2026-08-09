import SigmaDeviceManager from "@socure-inc/device-risk-sdk";
import { isDevConsoleEnabled } from "../env";
import { getSocureSdkKey } from "./socureSdkKey";

let initialized = false;

export { getSocureSdkKey } from "./socureSdkKey";

export function isSocureDeviceEnabled(): boolean {
  return Boolean(getSocureSdkKey());
}

export function initSocureDevice(): boolean {
  const sdkKey = getSocureSdkKey();
  if (isDevConsoleEnabled()) {
    console.info(
      "[Socure] VITE_SOCURE_SDK_KEY",
      sdkKey ?? "(missing — set at build time)",
    );
  }
  if (!sdkKey) return false;
  if (!initialized) {
    SigmaDeviceManager.initialize({ sdkKey });
    initialized = true;
  }
  return true;
}

export async function getSocureDiSessionToken(): Promise<string | undefined> {
  if (!initSocureDevice()) {
    if (isDevConsoleEnabled()) {
      console.warn("[Socure] getSessionToken skipped: SDK key missing");
    }
    return undefined;
  }
  try {
    const token = await SigmaDeviceManager.getSessionToken();
    const trimmed = token?.trim();
    if (isDevConsoleEnabled()) {
      console.info(
        "[Socure] getSessionToken",
        trimmed ? `${trimmed.slice(0, 8)}…` : "(empty)",
      );
    }
    return trimmed || undefined;
  } catch (err) {
    if (isDevConsoleEnabled()) {
      console.warn("[Socure] getSessionToken failed", err);
    }
    return undefined;
  }
}

export async function setSocureBindingNavigationContext(): Promise<void> {
  if (!initSocureDevice()) return;
  try {
    await SigmaDeviceManager.setNavigationContext("account_binding");
  } catch {
    // Non-blocking: binding can proceed without navigation context.
  }
}
