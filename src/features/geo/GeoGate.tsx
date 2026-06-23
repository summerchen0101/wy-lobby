import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { FullScreenLoadingOverlay } from "../../components/loading/FullScreenLoadingOverlay";
import { GEO_MESSAGE_KEYS, LEGAL_GEO_PATHS } from "./geoConstants";
import { GeoBlockModal } from "./GeoBlockModal";
import { useGeo } from "./geoContext";

export function GeoGate() {
  const { status, blockReason, recheck } = useGeo();
  const { pathname } = useLocation();
  const { t } = useTranslation("errors");
  const isLegalRoute = LEGAL_GEO_PATHS.has(pathname);
  const showBlock = status === "blocked" && !isLegalRoute;
  const message = t(
    blockReason ? GEO_MESSAGE_KEYS[blockReason] : GEO_MESSAGE_KEYS.region,
  );

  const checkingOverlay =
    status === "checking"
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
