/** 本輪登入（SPA 生命週期）是否已自動彈過；登出後清除，重新登入可再彈。 */
let autoPopupShownUserId: string | null = null;

export function wasDailyLoginAutoPopupShown(userId: string): boolean {
  const id = userId.trim();
  if (!id || id === "0") return false;
  return autoPopupShownUserId === id;
}

export function markDailyLoginAutoPopupShown(userId: string): void {
  const id = userId.trim();
  if (!id || id === "0") return;
  autoPopupShownUserId = id;
}

/** 登出時呼叫，讓下次登入（當日未打卡）可再自動彈出每日登入。 */
export function clearDailyLoginAutoPopupSession(): void {
  autoPopupShownUserId = null;
}
