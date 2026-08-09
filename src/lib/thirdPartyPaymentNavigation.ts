/** 同页跳转至第三方储值／提领付款页（不再另开新分页）。 */
export function navigateToThirdPartyPayment(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  window.location.assign(trimmed);
  return true;
}
