/**
 * 對應 proto/gateway/gateway.proto ApiType。
 * HTTP `/api/v1/login` 為身分驗證；WebSocket 連線後另送 `ServerLogin`(4) 完成 Gateway 會話。
 * access token refresh 時前端約定：保持 WS 不重握手，以 RequestBasic.token + 再次 `SERVER_LOGIN` 更新 Gateway 會話。
 */

export const GATEWAY_API_PING_PONG = 0
/**
 * Gateway `ApiType` **USER_KICK_BEFORE** (`UserKickBefore` = 2) — 伺服器主動推送，非 Request/Response 配對請求。
 * `data` 理想為 `gateway.UserKickBeforeReason`（reason 0–3）；alpha 後端亦常送 `code=204` 且 `data` 空，仍視為踢人。
 * 收到後應清空本機會話並導向登入（被踢端提示）。
 */
export const GATEWAY_API_USER_KICK_BEFORE = 2
/** 連線後伺服器登入；對應 ApiType ServerLogin / SERVER_LOGIN；`data` 為空；後端不回 response，前端以 `fireAndForget` 送出 */
export const GATEWAY_API_SERVER_LOGIN = 4
export const GATEWAY_API_LOBBY_GET = 11
/** 取得錢包與乞丐紅包補貼額度；body 為 megaman.WalletGetRequest；回應 megaman.WalletGetResponse */
export const GATEWAY_API_WALLET_GET = 12
/** 伺服器主動推播：ApiType SLOT_JACKPOT_INFO_PUSH(14)；body 常以 megaman.ListJackPotResp（與 141 相同），相容舊版 megaman.SlotJackPotInfo */
export const GATEWAY_API_SLOT_JACKPOT_PUSH = 14
/** 拉取 JP 資訊；回應常為 megaman.ListJackPotResp（見 web/proto/lobby_wire.proto） */
export const GATEWAY_API_GET_JACKPOT_INFO = 141
/** 切換使用中錢包 GC/SC；body 為 megaman.WalletUseRequest */
export const GATEWAY_API_WALLET_USE = 112

/** 玩家頭像列表；body 空；回應 megaman.ListPlayerAvatarsResponse */
export const GATEWAY_API_LIST_PLAYER_AVATARS = 22
/** 更新玩家頭像；body 為 megaman.UpdatePlayerCurrentAvatarRequest */
export const GATEWAY_API_UPDATE_PLAYER_AVATAR = 23
/** 更新新手教學進度；body 為 megaman.UpdateNoviceTeaching */
export const GATEWAY_API_UPDATE_NOVICE_TEACHING = 33
/** 刪除帳號；body 為 megaman.DeletePlayerInfoReq */
export const GATEWAY_API_DELETE_ACCOUNT = 34
/** 取得第三方遊戲連結；body 為 megaman.GetThirdPartyGameInfoRequest */
export const GATEWAY_API_GET_THIRD_PARTY_GAME_INFO = 701

/** 商城商品列表；body 為 megaman.ListProductsRequest */
export const GATEWAY_API_LIST_PRODUCTS = 316
/** 建立購買訂單；body 為 megaman.BuyProductRequest */
export const GATEWAY_API_BUY_PRODUCT = 317
/** 帳號／手機綁定；body 為 megaman.MegaAccountBindingRequest */
export const GATEWAY_API_MEGA_ACCOUNT_BINDING = 362

/** 提現訂單列表；body 為 megaman.ListWithdrawOrdersReq */
export const GATEWAY_API_LIST_WITHDRAW_ORDERS = 621
/** 建立提現訂單；body 為 megaman.CreateWithdrawOrderReq */
export const GATEWAY_API_CREATE_WITHDRAW_ORDER = 623

/** 伺服器推播外層：內層 MsgResp（見 megaman.MsgResp） */
export const GATEWAY_API_SEND_MESSAGE_PUSH = 1000
/** MsgResp.msg.apiType：付款完成（內層 data 為 megaman.PaymentPush） */
export const GATEWAY_API_PAYMENT_FINISH_PUSH = 1013

/** 伺服器主動推播 JP（JACKPOT_INFO_PUSH 1043）；解碼優先 ListJackPotResp，再 fallback SlotJackPotInfo（與 jackpotLobbyWire 一致） */
export const GATEWAY_API_JACKPOT_INFO_PUSH = 1043

/** 伺服器推播：其他玩家提現成功輪播；body 為 megaman.WithdrawSuccessPush */
export const GATEWAY_API_WITHDRAW_SUCCESS_PUSH = 1048

/** 帳變／購買紀錄列表；body 空；回應 megaman.ListPurchaseAndPrizeHistoriesResponse */
export const GATEWAY_API_LIST_PURCHASE_AND_PRIZE_HISTORIES = 801

/** 取得推廣好友活動資訊；body 空；回應 megaman.GetReferralInfoResp */
export const GATEWAY_API_GET_REFERRAL_INFO = 540
/** 領取推廣獎勵；body 空；回應 megaman.ClaimReferralRewardResp */
export const GATEWAY_API_CLAIM_REFERRAL_REWARD = 541

/** 活動列表；body 為 megaman.ListActivitiesRequest；回應 megaman.ListActivitiesResponse */
export const GATEWAY_API_LIST_ACTIVITY = 470
/** 活動詳情；body 為 megaman.GetActivityRequest；回應 megaman.GetActivityResponse */
export const GATEWAY_API_GET_ACTIVITY = 471
/** 領取活動獎勵；body 為 megaman.ActivityCollectRewardReq；回應 megaman.ActivityCollectRewardResp */
export const GATEWAY_API_ACTIVITY_COLLECT_REWARD = 495

/** 產生 AMOE 明信片抽獎代碼；body 空；回應 megaman.GenerateAmoeCodeResponse */
export const GATEWAY_API_GENERATE_AMOE_CODE = 560
/** 查詢自己的 AMOE 申請進度；body 為 megaman.ListUserAmoeEntriesReq */
export const GATEWAY_API_LIST_USER_AMOE_ENTRIES = 561

/** 伺服器推播：AMOE 明信片審核發幣成功；body 為 megaman.AmoeCreditedPush */
export const GATEWAY_API_AMOE_CREDITED_PUSH = 1085
/** 伺服器推播：AMOE 明信片審核未通過；body 為 megaman.AmoeInvalidPush */
export const GATEWAY_API_AMOE_INVALID_PUSH = 1086
