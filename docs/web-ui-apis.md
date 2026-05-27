# Web UI 實際使用的 API 說明

本文件依 **目前 `web` 專案程式碼** 整理：大廳、登入/註冊、帳戶、商店相關 UI 會呼叫的介面。  
**不包含** 遊戲內專用流程（房間內、牌桌/機台內的 Gateway `ApiType` 等）；若需完整 proto 列舉，見 [gateway-proto-api.md](./gateway-proto-api.md)。

---

## 1. 總覽

| 通道 | 用途 |
|------|------|
| **REST（JSON + `fetch`）** | v1：註冊 `POST /api/v1/signup`、**登入** `POST /api/v1/login`、refresh `POST /api/v1/token`、目前使用者、大廳遊戲列表、忘記密碼等。登入**僅**走此路徑。 |
| **WebSocket + Gateway 二進位** | 連線存活 `PING_PONG`、可選大廳遊戲 `LOBBY_GET`；**不** 用於帳密登入。 |
| **Mock 模式** | `VITE_API_USE_MOCK=true` 時不發真實 REST，由 [`web/src/lib/api/mock.ts`](../src/lib/api/mock.ts) 回傳。 |

實作入口：[`apiRequest`](../src/lib/api/client.ts)、[`getApiPaths`](../src/lib/api/paths.ts)、[`useGatewayWs` / `createGatewayWs`](../src/realtime/useGatewayWs.ts)。

---

## 2. REST：路徑與用途

基底 URL 為 **`VITE_API_BASE`**（可為空，僅 mock 本機時）；實際 URL 為 `joinUrl(路徑)`。預設路徑可經 `VITE_API_PATH_*` 覆寫，見 [`paths.ts`](../src/lib/api/paths.ts)。

### 2.1 大廳與認證（目前有 UI 或 Auth 呼叫）

| 方法 | 預設路徑 | 函式 | 呼叫處 / 行為 | 回傳型別（參考） |
|------|----------|------|----------------|------------------|
| `POST` | `/api/v1/signup` | `signUp` / `completeSignUp` → [`auth.ts`](../src/lib/api/auth.ts) | 註冊（`RegisterModal`／`RegisterPage`） | `SignupResult` 或 `AuthResponse` |
| `POST` | `/api/v1/login` | `login` | 登入（`AuthProvider`） | `AuthResponse`（可含 `aRefreshToken`） |
| `POST` | `/api/v1/token` | `refreshAccessToken` | 啟動與 401 換發 | 同上 |
| `GET` | `/api/user/me` | `fetchCurrentUser` | 有 token 時還原使用者、登入/註冊後刷新 | `User` |
| `GET` | `/api/lobby/games` | `fetchGames` → [`games.ts`](../src/lib/api/games.ts) | 已登入的 `LandingPage`：當 **未** 設定 `VITE_USE_WS_LOBBY_GAMES=true` 時用 REST 拉列表；啟用 WS 大廳時改走 `LOBBY_GET`，**不**呼叫本 API。 | `GamesResponse`（`{ items: Game[] }`） |
| `POST` | `/auth/forgot-password` | `requestPasswordReset` → [`passwordReset.ts`](../src/lib/api/passwordReset.ts) | `LoginModal` 忘記密碼 | 無內容成功即可 |

> `Forgot password` 路徑**不在** `getApiPaths()` 內，為固定相對路徑 `/auth/forgot-password`。

**Authorization**：需登入的 `GET` 帶 `Authorization: Bearer <token>`（`apiRequest` 的 `token` 參數）。

**型別定義**：[ `types.ts` ](../src/lib/api/types.ts)（`User`、`Game`、`AuthResponse` 等）。

### 2.2 金流（已封裝、尚未有頁面呼叫）

| 方法 | 預設路徑 | 函式 | 狀態 |
|------|----------|------|------|
| `GET` | `/api/payment/deposit` + query | `fetchDepositUrl` → [`wallet.ts`](../src/lib/api/wallet.ts) | 已實作；全專案目前 **沒有 import**，預留儲值導轉。Query：`returnUrl`（必填）、`channel`、`amount` 可選。回傳 `DepositResponse`（`url` 等）。 |

### 2.3 純本地／Mock、無後端 API

- **兌換頁小字訊息**：[`useRedeemPillMessages`](../src/features/lobby/useRedeemPillMessages.ts) 使用 `mockGetRedeemPillMessages`（僅 mock 延遲回傳字串陣列），**未** 呼叫 REST。

---

## 3. WebSocket Gateway（protobuf `Request` / `Response`）

連線與二進位編解碼：[`gatewayWs.ts`](../src/realtime/gatewayWs.ts)、[`gatewayWire.ts`](../src/realtime/gatewayWire.ts)。`type` 對應 `proto/gateway/gateway.proto` 的 `ApiType`；常數見 [`gatewayApi.ts`](../src/realtime/gatewayApi.ts)。`GatewayWsRequestPayload` 可選的 `debugLabel` 僅在開發建置（Vite `import.meta.env.DEV`）寫入 console 辨識用，不影響上線行為。

### 3.1 目前專案會送出的 `type`

| 數值 | 名稱 | 觸發時機 | 說明 |
|------|------|----------|------|
| `0` | `PING_PONG` | 連線成功後，若 `heartbeatIntervalMs > 0`（預設 25s 週期） | 維持連線，**不帶**業務 `data`（空 bytes）。 |
| `11` | `LOBBY_GET` | 見下節 | 大廳遊戲列表；`data` 目前送 **空** `Uint8Array`；成功且 `code === 200` 時用 [`decodeLobbyGetResponseBytes`](../src/realtime/lobbyDecode.ts) 解 `LobbyGetResponse` 再轉成畫面用 `Game[]`。 |

`LOBBY_GET` 僅在 **`onOpen` 內** 且 **`shouldRunLobbyGetOnOpen`** 為真時送出（[`LandingPage.tsx`](../src/features/lobby/LandingPage.tsx)）：

- 開發模式且 **`VITE_DEV_LOBBY_GET` ≠ `"false"`**，或
- **`VITE_USE_WS_LOBBY_GAMES === "true"`**（訪客或已登入皆可能建連，依 `gatewayWsEnabled`）。

另：**Gateway WebSocket 是否啟用** 為 `gatewayWsEnabled`：開發可透過 **`VITE_DEV_GATEWAY_WS`** probe，或當 `VITE_USE_WS_LOBBY_GAMES` 啟用時（含未登入訪客連線，見程式）。

### 3.2 專案目前不會從大廳 UI 主動送出的類型

舉凡：入房、錢包、好友、公會、老虎機內、錦標賽遊戲內專用等 `ApiType`，**本 Web 專案皆未使用**。帳密登入亦**不**走 WebSocket。遊戲內邏輯多由另開的 WebGL／iframe／外部 URL 處理，不列入本表。

### 3.3 可能**被動收到**的 `Response.type`（不逐一實作處理）

若伺服器推播，可能出現與 [gateway-proto-api.md](./gateway-proto-api.md) 中 `ApiType` 1000+ 等一致之 `type`；目前大廳 **沒有** 針對各 push 寫專屬處理，多數僅經 `onResponse` 略過或 dev log。

### 3.4 除錯：`[gateway-ws] request timeout`（`LOBBY_GET` 等 `request()`）

表示在逾時時間內（預設 **15s**，可調 `VITE_WS_REQUEST_TIMEOUT_MS`）沒有收到 **可與該次 `RequestBasic.requestID` 配對** 的 `gateway.Response` 二進位訊息。WebSocket 在 Network 顯示已連線（101）仍可能發生——那是 **單一 RPC** 逾時，不是 HTTP 失敗。

請在 **DevTools → Network → 該 WebSocket → Messages** 檢查是否有進站二進位（不要只看連線狀態列）。建議開啟 `VITE_GATEWAY_WS_TRACE=true`，對照 console：

| 現象 | 較可能原因 |
|------|------------|
| 有 `[gateway-ws] ← response` 且緊接 `response did not match any pending request` | 後端未回寫相同 `ResponseBasic.requestID`（加長逾時無效；見 [gateway-proto-api.md §2.3](./gateway-proto-api.md)） |
| 完全沒有對應 API 的 `← response` | 後端未回、環境／token 錯誤、或路由問題 |
| 有 `← response` 且 requestID 正確但仍 timeout | 回應晚於逾時；可試加大 `VITE_WS_REQUEST_TIMEOUT_MS` |
| 僅偶發、換網路改善 | 延遲或後端負載 |

**Network 左側出現多條 `ws?token=...`：** 常為重連、Strict Mode 雙掛載或 token 變更；請點選**目前正在送 LOBBY_GET 的那一條**看 Messages。若某條只有 ↑ 沒有 ↓，表示該 socket 上的 RPC 未配對到回包（回包可能在另一條連線上）。

**第二階段前端行為（大廳）：**

- `onOpen`（bootstrap：`LOBBY_GET` → `SERVER_LOGIN` → `GET_JACKPOT`）**完成後**才啟動週期心跳與首包 PING。
- `serializeRequests`：同一時間僅一筆 `request()` pending。
- 回包配對：`requestID` → 唯一 `Response.type` → 單 pending fallback。
- `skipInitialPing`、`pairUnmatchedSuccessToSinglePending`；輪詢預設為 request 逾時 **+5s**（`VITE_WS_LOBBY_GET_POLL_MS` 可覆寫）。
- LOBBY_GET 逾時會自動重試一次；UI 不顯示 UUID。`WebSocket connection error` 在重連 `open` 後清除，傳輸層 `onerror` 延遲 2s 才顯示。

### 3.5 WS 握手 token 失效 → 先 refresh，失敗再導向 `/login`

已登入且帶 token 連線 Gateway 時，若 IAM 在握手階段拒絕（後端常見 `401001`、瀏覽器多為 `CloseEvent.code` **1006**），[`gatewayWs`](../src/realtime/gatewayWs.ts) 會在 **本 client 從未成功 `open`** 時將 `shutdownReason` 設為 `auth_rejected` 且 **不再重連**。[`GatewayLobbyProvider`](../src/realtime/GatewayLobbyProvider.tsx) 收到後會先以 [`tryRefreshSession`](../src/auth/AuthProvider.tsx)（[`refreshSession`](../src/auth/refreshSession.ts) single-flight）換發 access；成功則 `useGatewayWs` 依新 `wsToken` 自動重連。同一輪 access 內僅嘗試一次 refresh；refresh 失敗或換發後仍被拒絕時，才清除 session 並 `navigate('/login')`。連線已建立後的 `SERVER_LOGIN`／`LOBBY_GET` 等非成功 code 則依 `VITE_WS_SESSION_INVALID_CODES`（預設含 `401001`）走相同流程。

---

## 4. 環境變數與行為速查

| 變數 | 與 API 的關係 |
|------|----------------|
| `VITE_API_BASE` | REST 基底；mock 可留空。 |
| `VITE_API_USE_MOCK` | 為 `true` 時 REST 全走 mock。 |
| `VITE_API_PATH_AUTH_REGISTER` / `LOGIN` / `LOBBY_GAMES` / `USER_ME` / `PAYMENT_DEPOSIT` | 覆寫預設 REST 路徑。 |
| `VITE_WS_URL`、`VITE_WS_DEVICE_ID` | Gateway WebSocket 連線 URL（[`env.ts` `getGatewayWsUrl`](../src/lib/env.ts)）。 |
| `VITE_WS_HANDSHAKE_TIMEOUT_MS` | 握手：送出連線後若未 `open` 則放棄（預設 15000）。 |
| `VITE_WS_REQUEST_TIMEOUT_MS` | 單則 `request()` 逾時（預設 15000）；0 關閉。 |
| `VITE_WS_LOBBY_GET_POLL_MS` | 大廳 `LOBBY_GET` 輪詢；未設則 request 逾時 + 5000。 |
| `VITE_WS_AUTH_FAILURE_CLOSE_CODES` | 握手／傳輸層：指定 Close code 視為 `auth_rejected`（逗號分隔）；未設時另以「從未 open」判定。 |
| `VITE_WS_SESSION_INVALID_CODES` | 連線已 open 後：Gateway 業務 `code` 視為 session 失效並導向登入（預設 `401,403,401001`）。 |
| `VITE_GATEWAY_WS_TRACE` | 輸出 `[gateway-ws] -> request` / `← response` 與配對失敗 warn；除錯 timeout 必開。 |
| `VITE_USE_WS_LOBBY_GAMES` | 為 `true`：啟用 WS、並以 `LOBBY_GET` 解出來的列表作為大廳遊戲來源（可含訪客）。 |
| `VITE_DEV_GATEWAY_WS` / `VITE_DEV_LOBBY_GET` | 開發用：方便連上 Gateway / 送 `LOBBY_GET` 除錯。 |
| `VITE_CLIENT_VER` | 寫入每則 `RequestBasic.clientVer`。 |

---

## 5. 相關檔案索引

- REST：`lib/api/*`
- WS：`src/realtime/gatewayWs.ts`、`useGatewayWs.ts`
- 大廳遊戲二進位解碼：`lobbyDecode.ts`（對齊 `web/proto/lobby_wire.proto` 與完整 [`proto/megaman/lobby.proto`](../../proto/megaman/lobby.proto) 說明見 [gateway-proto-api.md 第 3 節](./gateway-proto-api.md)）

本表隨產品擴充可能變更；**以實際 `grep` 呼叫處與本檔同步為準。**
