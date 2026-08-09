export const TOKEN_STORAGE_KEY = "luklok_access_token";

export const REFRESH_TOKEN_STORAGE_KEY = "luklok_refresh_token";

/** Absolute access expiry (ms since epoch), derived from login/refresh `expiresIn`. */
export const ACCESS_EXPIRES_AT_MS_KEY = "luklok_access_expires_at";

export const USER_STORAGE_KEY = "luklok_user_json";

/** Last email used on the password login form (prefill only; not auth state). */
export const LAST_LOGIN_ACCOUNT_STORAGE_KEY = "luklok_last_login_account";
