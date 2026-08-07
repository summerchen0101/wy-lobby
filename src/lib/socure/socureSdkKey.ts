export function getSocureSdkKey(): string | undefined {
  const key = import.meta.env.VITE_SOCURE_SDK_KEY?.trim();
  return key || undefined;
}

export function isSocureSdkKeyConfigured(): boolean {
  return Boolean(getSocureSdkKey());
}
