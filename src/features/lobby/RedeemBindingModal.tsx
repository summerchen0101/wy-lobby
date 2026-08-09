import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  RedeemProtectAccountView,
  type RedeemBindingMode,
  type RedeemBindingPrefill,
} from "./RedeemProtectAccountView";

export type { RedeemBindingMode };

type Props = {
  open: boolean;
  mode: RedeemBindingMode;
  onClose: () => void;
  onBound: () => void;
  bindingPrefill?: RedeemBindingPrefill;
};

export function RedeemBindingModal({
  open,
  mode,
  onClose,
  onBound,
  bindingPrefill,
}: Props) {
  const handleBackdrop = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={handleBackdrop}>
      <div
        className="app-modal app-modal--col app-modal--redeem-binding shop-checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-protect-dialog-title"
        onClick={(e) => e.stopPropagation()}>
        <RedeemProtectAccountView
          open={open}
          mode={mode}
          onClose={onClose}
          onBound={onBound}
          bindingPrefill={bindingPrefill}
        />
      </div>
    </div>,
    document.body,
  );
}
