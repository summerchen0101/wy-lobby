import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { FullScreenLoadingOverlay } from "../../components/loading/FullScreenLoadingOverlay";
import { GEO_MESSAGE_KEYS, LEGAL_GEO_PATHS } from "./geoConstants";
import { GeoBlockModal } from "./GeoBlockModal";
import { useGeo } from "./geoContext";

export function GeoGate() {
  const { token, user } = useAuth();
  const { status, blockReason, recheck } = useGeo();
  const { pathname } = useLocation();
  const { t } = useTranslation("errors");
  const loggedIn = Boolean(token?.trim() && user?.id?.trim());
  const isLegalRoute = LEGAL_GEO_PATHS.has(pathname);
  // All geo blocking (region / proxy / permissions / …) only after login.
  const showBlock = loggedIn && status === "blocked" && !isLegalRoute;
  const message = t(
    blockReason ? GEO_MESSAGE_KEYS[blockReason] : GEO_MESSAGE_KEYS.region,
  );

  const checkingOverlay =
    loggedIn && status === "checking"
      ? createPortal(<FullScreenLoadingOverlay />, document.body)
      : null;

  const blockModal = showBlock
    ? createPortal(
        <GeoBlockModal message={message} onRetry={() => void recheck()} />,
        document.body,
      )
    : null;

  return (
    <>
      {checkingOverlay}
      {blockModal}
    </>
  );
}
