import SigmaDeviceManager from "@socure-inc/device-risk-sdk";

let initialized = false;

export function getSocureSdkKey(): string | undefined {
  const key = import.meta.env.VITE_SOCURE_SDK_KEY?.trim();
  return key || undefined;
}

export function isSocureDeviceEnabled(): boolean {
  return Boolean(getSocureSdkKey());
}

export function initSocureDevice(): boolean {
  const sdkKey = getSocureSdkKey();
  if (!sdkKey) return false;
  if (!initialized) {
    SigmaDeviceManager.initialize({ sdkKey });
    initialized = true;
  }
  return true;
}

export async function getSocureDiSessionToken(): Promise<string | undefined> {
  if (!initSocureDevice()) return undefined;
  try {
    const token = await SigmaDeviceManager.getSessionToken();
    const trimmed = token?.trim();
    return trimmed || undefined;
  } catch {
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
