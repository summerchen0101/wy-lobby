import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { getProfileAvatarById } from "./profileAvatars";
import { resolveProfileVipTitle } from "./profileVipTitle";
import "./MyProfileModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenVip?: () => void;
  userId: string | undefined;
  displayName: string | undefined;
  avatarId: string;
  email?: string;
  phone?: string;
  /** Gateway LOBBY_GET 尚在載入時為 true，可避免誤以為聯絡資料未注入 */
  profileSyncPending?: boolean;
};

export function MyProfileModal({
  open,
  onClose,
  onOpenVip,
  userId,
  displayName,
  avatarId,
  email,
  phone,
  profileSyncPending = false,
}: Props) {
  const { user } = useAuth();
  const titleId = useId();
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  const initial = (
    displayName?.trim()?.[0] ??
    userId?.[0] ??
    "?"
  ).toUpperCase();

  const pickedAvatar = getProfileAvatarById(avatarId);
  const showAvatarImage = Boolean(pickedAvatar && !avatarImgFailed);

  useEffect(() => {
    if (open) {
      setAvatarImgFailed(false);
    }
  }, [open, avatarId]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  if (!open) return null;

  const headline =
    displayName?.trim() || userId?.trim() || "—";
  const emailText = email?.trim() ?? "";
  const phoneText = phone?.trim() ?? "";
  const vipTitle = resolveProfileVipTitle(user?.vipLevel);

  return createPortal(
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="app-modal app-modal--col my-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <h2 id={titleId} className="app-modal__title">
            MY PROFILE
          </h2>
          <button
            type="button"
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <hr className="app-modal__rule" />
        <div className="my-profile-modal__inner">
          {profileSyncPending ? (
            <p className="my-profile-modal__sync-hint" role="status">
              Loading account details…
            </p>
          ) : null}
          <div
            className="my-profile-modal__avatar"
            role="img"
            aria-label="Profile picture"
          >
            <span className="my-profile-modal__avatar-media">
              {showAvatarImage && pickedAvatar ? (
                <img
                  className="my-profile-modal__avatar-img"
                  src={pickedAvatar.imageSrc}
                  alt=""
                  onError={() => setAvatarImgFailed(true)}
                />
              ) : (
                <span className="my-profile-modal__avatar-initial">
                  {initial}
                </span>
              )}
            </span>
          </div>
          <p className="my-profile-modal__id">{headline}</p>
          <div className="my-profile-modal__level-row">
            <span className="my-profile-modal__level-label">{vipTitle}</span>
            <button
              type="button"
              className="my-profile-modal__info-btn"
              aria-label="Open VIP level details"
              onClick={onOpenVip}
              disabled={!onOpenVip}
            >
              <Info
                className="my-profile-modal__info-icon"
                strokeWidth={2.75}
                aria-hidden
              />
            </button>
          </div>
          <div className="my-profile-modal__fields">
            <div className="my-profile-modal__field">
              <span className="my-profile-modal__field-label">Email:</span>
              <span
                className={
                  "my-profile-modal__field-value" +
                  (emailText ? "" : " my-profile-modal__field-value--empty")
                }
                aria-label="Email"
              >
                {emailText || "Not set"}
              </span>
            </div>
            <div className="my-profile-modal__field">
              <span className="my-profile-modal__field-label">Phone:</span>
              <span
                className={
                  "my-profile-modal__field-value" +
                  (phoneText ? "" : " my-profile-modal__field-value--empty")
                }
                aria-label="Phone"
              >
                {phoneText || "Not set"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
