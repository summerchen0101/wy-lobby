import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BindingResultView } from "../../components/binding/BindingResultView";
import { useWordData } from "../../wordData/useWordData";
import {
  RedeemProtectAccountView,
  type RedeemBindingMode,
  type RedeemBindingPrefill,
} from "./RedeemProtectAccountView";

export type { RedeemBindingMode };

type BindingResult = "verified" | "failed";

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
  const w = useWordData();
  const [bindingResult, setBindingResult] = useState<BindingResult | null>(null);

  useEffect(() => {
    if (!open) setBindingResult(null);
  }, [open]);

  const handleBackdrop = useCallback(() => {
    if (bindingResult) return;
    onClose();
  }, [bindingResult, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (bindingResult) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, bindingResult, onClose]);

  const handleBindingComplete = useCallback((result: BindingResult) => {
    setBindingResult(result);
  }, []);

  const handleResultConfirm = useCallback(() => {
    if (bindingResult === "verified") {
      onBound();
    } else {
      onClose();
    }
    setBindingResult(null);
  }, [bindingResult, onBound, onClose]);

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
        {bindingResult ? (
          <BindingResultView
            message={w(bindingResult === "verified" ? 1209 : 1222)}
            onConfirm={handleResultConfirm}
          />
        ) : (
          <RedeemProtectAccountView
            open={open}
            mode={mode}
            onClose={onClose}
            onBindingComplete={handleBindingComplete}
            bindingPrefill={bindingPrefill}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
