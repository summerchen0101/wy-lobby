import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useWordData } from "../../wordData/useWordData";
import { formatScFromRawWireInteger } from "../../wallet/formatWalletAmount";
import "./RedeemApprovalModal.css";

type Props = {
  open: boolean;
  amountsWire: string[];
  onClose: () => void;
};

function sumRedeemAmountsWire(amounts: string[]): string {
  let total = BigInt(0);
  for (const raw of amounts) {
    const t = raw.trim().replace(/,/g, "");
    if (!/^\d+$/.test(t)) continue;
    try {
      total += BigInt(t);
    } catch {
      /* skip invalid */
    }
  }
  return total.toString();
}

function formatApprovalFiatDisplay(amountsWire: string[]): string {
  if (amountsWire.length === 1) {
    const n = formatScFromRawWireInteger(amountsWire[0] ?? "");
    return n === "—" ? "—" : `$${n}`;
  }
  const total = sumRedeemAmountsWire(amountsWire);
  const n = formatScFromRawWireInteger(total);
  return n === "—" ? "—" : `$${n}`;
}

export function RedeemApprovalModal({ open, amountsWire, onClose }: Props) {
  const w = useWordData();
  const titleId = useId();
  const single = amountsWire.length === 1;
  const amountDisplay = formatApprovalFiatDisplay(amountsWire);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || amountsWire.length === 0) return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      role="presentation"
      onClick={onClose}>
      <div
        className="app-modal redeem-approval-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="redeem-approval-modal__title">
          {w(510500)}
        </h2>
        <div className="redeem-approval-modal__body">
          <p className="redeem-approval-modal__lead">
            {single ? w(510501) : w(510503)}
          </p>
          <p className="redeem-approval-modal__amount">{amountDisplay}</p>
          <p className="redeem-approval-modal__tail">
            {single ? w(510502) : w(510504)}
          </p>
        </div>
        <button
          type="button"
          className="redeem-approval-modal__cta"
          onClick={onClose}>
          {w(510505)}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function formatRedeemApprovalAmountsForTest(amountsWire: string[]): string {
  return formatApprovalFiatDisplay(amountsWire);
}
