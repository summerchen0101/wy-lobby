import type { AuthResponse, User } from "../lib/api/types";
import { readPersistedUser } from "./userPersist";

/** 憑證仍在但 user json 缺失／無法解析時使用。 */
export function minimalSessionUser(): User {
  return { id: "0", displayName: "Player" };
}

export function resolveUserAfterAuth(res: AuthResponse): User {
  if (res.user) return res.user;
  const persisted = readPersistedUser();
  return persisted ?? minimalSessionUser();
}
