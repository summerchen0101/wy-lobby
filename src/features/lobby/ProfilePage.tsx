import { useCallback, useEffect, useId, useState } from "react";
import { Copy, Info, Pencil, Volume2 } from "lucide-react";
import { useAlert } from "../../components/alert/alertContext";
import { useAuth } from "../../auth/useAuth";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import {
  GATEWAY_API_LIST_PLAYER_AVATARS,
  GATEWAY_API_UPDATE_PLAYER_AVATAR,
} from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeListPlayerAvatarsResponseBytes,
  decodePlayerAvatarsInfoBytes,
  encodeUpdatePlayerCurrentAvatarRequest,
} from "../../realtime/playerAvatarWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { ChangeHeadIconModal } from "./ChangeHeadIconModal";
import { FundsHistoryModal } from "./FundsHistoryModal";
import { MyProfileModal } from "./MyProfileModal";
import { VipModal } from "./VipModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import {
  effectiveAvatarId,
  getProfileAvatarById,
  itemIdFromAvatarUrlField,
  itemIdFromAvatarWireId,
} from "./profileAvatars";
import {
  headIconChoicesFromServerRows,
  type HeadIconChoice,
} from "./profileAvatarChoices";
import { openZendeskOrFallback } from "../../lib/zendeskSupport";
import {
  profileAvatarFrameUrl,
  profileVipBadgeUrl,
} from "../../lib/profileAssets";
import { useProfileAvatarId } from "./profileAvatarStorage";
import {
  isLobbySoundEnabled,
  LOBBY_SOUND_PREF_STORAGE_KEY,
  notifyLobbySoundPreferenceChanged,
} from "../../lib/lobbySound";
import { profileVipProgress } from "./profileVipProgress";
import { resolveProfileVipTitle } from "./profileVipTitle";
import { useWordData } from "../../wordData/useWordData";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import "./ProfilePage.css";
import "./SessionPageDecor.css";
import "../../components/profile/ProfileAvatarFrame.css";

export function ProfilePage() {
  const w = useWordData();
  const { show } = useAlert();
  const { user, mergeUser, refreshUser, logout } = useAuth();
  const { requestRef, gatewayRequestReady, refreshLobbyGet, lobbyLoading } =
    useGatewayLobby();
  const { avatarId, setAvatarId } = useProfileAvatarId();
  const [headIconOpen, setHeadIconOpen] = useState(false);
  const [headIconChoices, setHeadIconChoices] = useState<
    HeadIconChoice[] | null
  >(null);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [fundsHistoryOpen, setFundsHistoryOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isLobbySoundEnabled());
  const soundLabelId = useId();

  const {
    isMaxLevel: vipProgressIsMax,
    current: vipProgressCurrent,
    required: vipProgressRequired,
    fillPct: vipProgressFillPct,
  } = profileVipProgress(user);
  const vipLevel = user?.vipLevel ?? 0;
  const vipTitle = resolveProfileVipTitle(vipLevel);

  const onRefresh = useCallback(async () => {
    try {
      await refreshUser();
    } catch {
      /* ignore */
    }
  }, [refreshUser]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        onRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [onRefresh]);

  const copyUid = useCallback(() => {
    const id = user?.id;
    if (!id) return;
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        show("Copied", { variant: "success" });
      })
      .catch(() => {
        show("Could not copy", { variant: "error" });
      });
  }, [user?.id, show]);

  const initial = (
    user?.displayName?.trim()?.[0] ??
    user?.id?.[0] ??
    "?"
  ).toUpperCase();

  const displayAvatarId = effectiveAvatarId(user?.avatarId, avatarId);
  const pickedAvatar = getProfileAvatarById(displayAvatarId);
  const showAvatarImage = Boolean(pickedAvatar && !avatarImgFailed);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [displayAvatarId]);

  useEffect(() => {
    if (!headIconOpen) return;
    setHeadIconChoices(null);
    if (!isWsLobbyGamesEnabled() || !gatewayRequestReady) return;
    const req = requestRef.current;
    if (!req) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await req({
          type: GATEWAY_API_LIST_PLAYER_AVATARS,
          data: new Uint8Array(0),
          debugLabel: "LIST_PLAYER_AVATARS",
        });
        if (cancelled) return;
        if (
          isGatewaySuccessCode(String(r.code)) &&
          r.data instanceof Uint8Array
        ) {
          if (r.data.byteLength === 0) {
            setHeadIconChoices(null);
            return;
          }
          const { avatarsInfo } = decodeListPlayerAvatarsResponseBytes(r.data);
          const next = headIconChoicesFromServerRows(avatarsInfo);
          setHeadIconChoices(next.length > 0 ? next : null);
        }
      } catch {
        if (!cancelled) setHeadIconChoices(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [headIconOpen, gatewayRequestReady, requestRef]);

  const confirmHeadIcon = useCallback(
    async (selectedId: string) => {
      const itemId = itemIdFromAvatarWireId(selectedId);
      if (itemId === undefined) {
        show("Could not update avatar", { variant: "error" });
        return;
      }
      if (!user) return;

      const wsOk = isWsLobbyGamesEnabled();
      if (wsOk) {
        if (!gatewayRequestReady || !requestRef.current) {
          show("Could not update avatar", { variant: "error" });
          return;
        }
        try {
          const body = encodeUpdatePlayerCurrentAvatarRequest({
            avatarID: itemId,
            avatarURL: "",
            isFBAvatar: false,
          });
          const r = await requestRef.current({
            type: GATEWAY_API_UPDATE_PLAYER_AVATAR,
            data: body,
            debugLabel: "UPDATE_PLAYER_AVATAR",
          });
          if (!isGatewaySuccessCode(String(r.code ?? ""))) {
            show(
              translateGatewayError(
                String(r.code ?? ""),
                r.errMessage,
                "Could not update avatar",
              ),
              { variant: "error" },
            );
            return;
          }
          let mergedId = itemId;
          if (r.data instanceof Uint8Array && r.data.byteLength > 0) {
            try {
              const row = decodePlayerAvatarsInfoBytes(r.data);
              const fromResp =
                itemIdFromAvatarWireId(row.avatarID) ??
                itemIdFromAvatarUrlField(row.avatarUrl);
              if (fromResp !== undefined) mergedId = fromResp;
            } catch {
              /* keep request item id */
            }
          }
          setAvatarId(String(mergedId));
          mergeUser({ avatarId: mergedId });
          try {
            await refreshLobbyGet();
          } catch {
            /* local state already updated */
          }
        } catch {
          show("Could not update avatar", { variant: "error" });
        }
        return;
      }

      setAvatarId(String(itemId));
      mergeUser({ avatarId: itemId });
    },
    [
      gatewayRequestReady,
      mergeUser,
      refreshLobbyGet,
      requestRef,
      setAvatarId,
      show,
      user,
    ],
  );

  const displayHandle = user?.displayName?.trim() || user?.id?.trim() || "—";

  const profileSyncPending = isWsLobbyGamesEnabled() && lobbyLoading;

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          LOBBY_SOUND_PREF_STORAGE_KEY,
          next ? "1" : "0",
        );
      } catch {
        /* ignore */
      }
      notifyLobbySoundPreferenceChanged();
      return next;
    });
  }

  const onEditAvatar = useCallback(() => {
    setHeadIconOpen(true);
  }, []);

  function onMyProfile() {
    setMyProfileOpen(true);
  }

  function onOpenVip() {
    setVipOpen(true);
  }

  function onSupport() {
    openZendeskOrFallback();
  }

  return (
    <section
      className="profile-page page-container session-page session-page--pattern"
      aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="profile-page__title">
        {w(510750)}
      </h1>
      <div className="profile-page__card">
        <div className="profile-page__hero">
          <div className="profile-page__avatar-stack">
            <div className="profile-page__avatar-wrap">
              <button
                type="button"
                className={
                  "profile-page__avatar" +
                  (showAvatarImage ? " profile-page__avatar--has-image" : "")
                }
                onClick={onEditAvatar}
                aria-label="Change head icon"
                title="Change head icon">
                <span className="profile-page__avatar-media">
                  {showAvatarImage && pickedAvatar ? (
                    <img
                      className="profile-page__avatar-img"
                      src={pickedAvatar.imageSrc}
                      alt=""
                      onError={() => setAvatarImgFailed(true)}
                    />
                  ) : (
                    <span className="profile-page__avatar-initial">
                      {initial}
                    </span>
                  )}
                </span>
                <img
                  className="profile-avatar-frame"
                  src={profileAvatarFrameUrl()}
                  alt=""
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className="profile-page__edit"
                onClick={onEditAvatar}
                aria-label="Change head icon"
                title="Change head icon">
                <Pencil className="profile-page__edit-icon" aria-hidden />
              </button>
            </div>
          </div>
          <p className="profile-page__display-name">{displayHandle}</p>
          <div className="profile-page__uid-inline">
            <span className="profile-page__uid-muted">
              <span className="profile-page__uid-prefix">UID:</span>
              {user?.id ?? "—"}
            </span>
            <button
              type="button"
              className="profile-page__copy profile-page__copy--icon"
              onClick={copyUid}
              disabled={!user?.id}
              aria-label="Copy UID"
              title="Copy UID">
              <Copy
                className="profile-page__uid-copy-icon"
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
          </div>
          <div className="profile-page__level-row">
            <span className="profile-page__level-label">{vipTitle}</span>
            <button
              type="button"
              className="profile-page__info-btn"
              aria-label="Open VIP level details"
              onClick={onOpenVip}>
              <Info
                className="profile-page__level-info-icon"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </div>
        </div>
        <div className="profile-page__progress">
          <div className="profile-page__bar-row">
            <div
              className="profile-page__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={vipProgressIsMax ? 100 : vipProgressRequired}
              aria-valuenow={vipProgressIsMax ? 100 : vipProgressCurrent}
              aria-valuetext={vipProgressIsMax ? "MAX" : undefined}
              aria-label="Level progress">
              <div
                className="profile-page__bar-fill"
                style={{ width: `${vipProgressFillPct}%` }}
              />
              <span className="profile-page__bar-label">
                {vipProgressIsMax
                  ? "MAX"
                  : `${vipProgressCurrent}/${vipProgressRequired}`}
              </span>
              <div className="profile-page__bar-cap" aria-hidden>
                <img
                  className="profile-page__bar-badge-img"
                  src={profileVipBadgeUrl(vipLevel)}
                  alt=""
                />
              </div>
            </div>
          </div>
        </div>

        <div className="profile-page__settings">
          <div className="profile-page__setting-row">
            <span className="profile-page__setting-label" id={soundLabelId}>
              <Volume2
                className="profile-page__setting-icon"
                strokeWidth={2}
                aria-hidden
              />
              {w(510752)}
            </span>
            <button
              type="button"
              className="profile-page__switch"
              role="switch"
              aria-checked={soundOn}
              aria-labelledby={soundLabelId}
              onClick={toggleSound}>
              <span className="profile-page__switch-thumb" />
            </button>
          </div>
        </div>

        <div className="profile-page__btns">
          <button
            type="button"
            className="profile-page__btn-pill"
            onClick={onMyProfile}>
            {w(510753)}
          </button>
          <button
            type="button"
            className="profile-page__btn-pill"
            onClick={onSupport}>
            {w(510754)}
          </button>
          <button
            type="button"
            className="profile-page__btn-pill"
            onClick={() => setFundsHistoryOpen(true)}>
            {w(510755)}
          </button>
          <button
            type="button"
            className="profile-page__btn-pill"
            onClick={() => logout()}>
            {w(510756)}
          </button>
        </div>

        <div className="profile-page__footer">
          <a className="profile-page__privacy" href="/privacy">
            {w(209)}
          </a>
          <button
            type="button"
            className="profile-page__delete-btn btn-crown-secondary"
            onClick={() => setDeleteAccountOpen(true)}>
            {w(510757)}
          </button>
        </div>
      </div>

      <MyProfileModal
        open={myProfileOpen}
        onClose={() => setMyProfileOpen(false)}
        onOpenVip={onOpenVip}
        userId={user?.id}
        displayName={user?.displayName}
        avatarId={displayAvatarId ?? ""}
        email={user?.email}
        phone={user?.phone}
        profileSyncPending={profileSyncPending}
      />

      <ChangeHeadIconModal
        open={headIconOpen}
        onClose={() => setHeadIconOpen(false)}
        currentAvatarId={displayAvatarId ?? "1"}
        onConfirm={confirmHeadIcon}
        choices={headIconChoices}
      />

      <FundsHistoryModal
        open={fundsHistoryOpen}
        onClose={() => setFundsHistoryOpen(false)}
      />

      <VipModal open={vipOpen} onClose={() => setVipOpen(false)} />
      <DeleteAccountModal
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      />
    </section>
  );
}
