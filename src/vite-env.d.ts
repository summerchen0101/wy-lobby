/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 檔期主題 id，寫入 <html data-theme>；對應 theme-seasonal.css */
  readonly VITE_APP_THEME?: string;
  readonly VITE_API_BASE: string;
  /** 內嵌遊戲/金流：預設與新分頁。設為 "true" 則遊戲預設新分頁（可覆寫每款遊戲） */
  readonly VITE_OPEN_GAMES_IN_NEW_WINDOW: string;
  readonly VITE_API_PATH_AUTH_REGISTER?: string;
  readonly VITE_API_PATH_AUTH_LOGIN?: string;
  readonly VITE_API_PATH_AUTH_TOKEN?: string;
  readonly VITE_APPLE_OAUTH_CLIENT_ID?: string;
  /** access 到期前主動 refresh 的提前秒數（預設 0；需後端回 expiresIn） */
  readonly VITE_TOKEN_REFRESH_LEAD_SEC?: string;
  /** 僅 dev：Vite 將 /api 代理到此目標 */
  readonly VITE_DEV_PROXY: string;
  /** 大廳「Single1 (Alpha)」內嵌試玩 URL（可覆寫預設 alpha 站） */
  readonly VITE_UNITY_DEMO_URL?: string;
  /** Gateway WebSocket 基底（建議不含 query；`token`/`deviceid` 由程式組裝） */
  readonly VITE_WS_URL?: string;
  /** WebSocket query `deviceid`；不設則用 alpha 內建預設 UUID */
  readonly VITE_WS_DEVICE_ID?: string;
  /** Unity WebGL WebEntry（slot）；預設 alpha WebEntry 路徑 */
  readonly VITE_UNITY_WEBENTRY_URL?: string;
  /**
   * 設為 "true" 時內建 slot 開局走 WebEntry：`game_id`、`mode`（GC=1／SC=2）、`amount`、`vip_lv`；
   * `token` 僅已登入時帶入，試玩／未登入省略。
   */
  readonly VITE_USE_SLOT_WEBENTRY?: string;
  /** WebEntry 預設 slot 編號（預設 85） */
  readonly VITE_UNITY_WEBENTRY_GAME_ID?: string;
  /** 選填：Cursor/本機 NDJSON ingest 完整 URL（含 path）；未設或空字串時不發任何 POST */
  readonly VITE_AGENT_DEBUG_INGEST_URL?: string;
  /**
   * 應用程式開發診斷用 console（`[gateway-ws][dev]`、`[game-shell][dev]` 等）。
   * `"false"` 關閉；`"true"` 強制開啟（含 production/preview）；未設則等同 `import.meta.env.DEV`。
   */
  readonly VITE_DEV_CONSOLE?: string;

  /**
   * 僅 dev：`LandingPage` 是否自動連 Gateway WS 並 `console` 記錄。
   * 設為 `"false"` 可關閉；production build 一律不連線。
   */
  readonly VITE_DEV_GATEWAY_WS?: string;
  /** 僅 dev：連上後是否自動送 LOBBY_GET；`"false"` 關閉 */
  readonly VITE_DEV_LOBBY_GET?: string;
  /** 寫入 Gateway RequestBasic.clientVer */
  readonly VITE_CLIENT_VER?: string;
  /**
   * 非 mock 時預設以 WS LOBBY_GET 驅動大廳遊戲列表；設為 `"false"` 可關閉。
   */
  readonly VITE_USE_WS_LOBBY_GAMES?: string;
  /** Gateway WS：視為 session 失效並導向登入的回應 code（逗號分隔），預設 401,403,401001 */
  readonly VITE_WS_SESSION_INVALID_CODES?: string;
  /** 握手失敗後最多幾次重連（不含首次）；預設 6 */
  readonly VITE_WS_MAX_HANDSHAKE_ATTEMPTS?: string;
  /** 視為拒絕憑證的 WebSocket CloseEvent.code（逗號分隔）；空則僅依重試上限與業務 code */
  readonly VITE_WS_AUTH_FAILURE_CLOSE_CODES?: string;
  /** 連線後若未在此毫秒內 open 則放棄此次嘗試；0 關閉；預設 15000 */
  readonly VITE_WS_HANDSHAKE_TIMEOUT_MS?: string;
  /** 單則 Gateway WS `request()` 逾時（毫秒）；0 關閉；預設 15000 */
  readonly VITE_WS_REQUEST_TIMEOUT_MS?: string;
  /** PING_PONG 心跳間隔（毫秒）；<=0 關閉；預設 5000 */
  readonly VITE_WS_HEARTBEAT_INTERVAL_MS?: string;
  /** 大廳 LOBBY_GET 輪詢間隔（毫秒）；未設則 request 逾時 + 5000 */
  readonly VITE_WS_LOBBY_GET_POLL_MS?: string;
  /** 大廳主視覺圖 URL（可覆寫預設 sample 圖） */
  readonly VITE_LOBBY_HERO_IMAGE?: string;
  /** 訪客首頁 hero 圖；未設則沿用 VITE_LOBBY_HERO_IMAGE／預設 */
  readonly VITE_GUEST_HERO_IMAGE?: string;
  /** Zendesk snippet Widget Key；未設則 ZendeskLoader 不注入腳本 */
  readonly VITE_ZENDESK_KEY?: string;
  /** 訪客頁聊天 FAB：完整 URL，點擊時新分頁開啟 */
  readonly VITE_SUPPORT_CHAT_URL?: string;
  /** Trustpilot Business Unit ID；未設則不載入 widget */
  readonly VITE_TRUSTPILOT_BUSINESS_UNIT_ID?: string;
  /** 浮動 CTA 點擊導向（預設 /profile） */
  readonly VITE_FLOATING_CTA_PATH?: string;
  /** 邀請好友連結的落地網址基底（不含尾隨 /）；不設則用執行時 `window.location.origin` */
  readonly VITE_REFERRAL_LANDING_URL?: string;
  /**
   * 設為 `"true"` 允許 Shop 開啟第三方金流結帳 URL（BUY_PRODUCT 新分頁）；未設或空值僅 Toast 阻擋，/shop、/redeem 仍可進入。
   */
  readonly VITE_PAYMENT_FEATURES_ENABLED?: string;
  /** Shop 第三方付款完成 redirect 路徑（預設 /payment/callback） */
  readonly VITE_PAYMENT_CALLBACK_BASE?: string;
  /** Redeem 第三方提現完成 redirect 路徑（預設 /redeem/callback） */
  readonly VITE_REDEEM_CALLBACK_BASE?: string;
  /** 第三方遊戲結束 redirect 路徑（預設 /game/callback） */
  readonly VITE_GAME_CALLBACK_BASE?: string;
  /**
   * 設為 `"true"` 啟用大廳第三方遊戲（PROVIDERS 分頁）；未設或空值為關閉。
   */
  readonly VITE_THIRD_PARTY_GAMES_ENABLED?: string;
  /**
   * 第三方遊戲大廳卡片縮圖基底（HTTPS，不帶尾隨 /）。
   * Alpha 範例：https://nas01.ffglobaltech.com；Prod：https://unityweb-cdn.boss-fun.com
   */
  readonly VITE_THIRD_PARTY_GAME_THUMB_BASE?: string;
  /**
   * `public/images/**` CDN origin（不含尾隨 /）。未設時沿用同源 `/images/...`。
   */
  readonly VITE_PUBLIC_IMAGE_CDN_BASE?: string;
  /** Radar Web SDK publishable key；未設則跳過地理圍欄檢查 */
  readonly VITE_RADAR_PUBLISHABLE_KEY?: string;
  /** Socure Digital Intelligence Web SDK key；未設則帳號綁定無法取得 di session token */
  readonly VITE_SOCURE_SDK_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
