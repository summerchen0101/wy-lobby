import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CoinFlyToBalance } from "../../components/CoinFlyToBalance";
import { CURRENCY_ICON_GC } from "../../lib/currencyIcons";
import { BEGGAR_ENVELOPE_PILL_BLOCK_URL } from "../../lib/beggarEnvelopeAssets";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import "./BeggarRedEnvelopeModal.css";

type Props = {
  open: boolean;
  amount: number;
  flying: boolean;
  onClaim: () => void;
  onFlyComplete: () => void;
  onClose: () => void;
};

export function BeggarRedEnvelopeModal({
  open,
  amount,
  flying,
  onClaim,
  onFlyComplete,
  onClose,
}: Props) {
  const titleId = useId();
  const pillRef = useRef<HTMLDivElement>(null);
  const [flyFromRect, setFlyFromRect] = useState<DOMRect | null>(null);

  const handleClaim = useCallback(() => {
    const el = pillRef.current;
    if (!el || flying) return;
    setFlyFromRect(el.getBoundingClientRect());
    onClaim();
  }, [flying, onClaim]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const displayAmount = formatCompactGcAmount(amount);

  return createPortal(
    <>
      <div
        className="beggar-envelope-overlay"
        role="presentation"
        aria-hidden={flying}
      >
        <button
          type="button"
          className="beggar-envelope-overlay__close"
          aria-label="Close"
          onClick={onClose}
          disabled={flying}
        >
          <X aria-hidden strokeWidth={2.4} />
        </button>

        <div
          className="beggar-envelope-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h2 id={titleId} className="beggar-envelope-modal__title">
            OUT OF COINS?
          </h2>
          <p className="beggar-envelope-modal__subtitle">
            GRAB YOUR{" "}
            <span className="beggar-envelope-modal__highlight">FREE COINS</span>
            <br />
            AND KEEP SPINNING!
          </p>

          <div className="beggar-envelope-modal__reward-wrap">
            <div
              ref={pillRef}
              className="beggar-envelope-modal__pill"
              aria-label={`Subsidy amount ${displayAmount}`}
            >
              <img
                className="beggar-envelope-modal__pill-bg"
                src={BEGGAR_ENVELOPE_PILL_BLOCK_URL}
                alt=""
                decoding="async"
              />
              <div className="beggar-envelope-modal__pill-content">
                <img
                  className="beggar-envelope-modal__coin-icon"
                  src={CURRENCY_ICON_GC}
                  alt=""
                  decoding="async"
                />
                <span className="beggar-envelope-modal__amount">{displayAmount}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="beggar-envelope-modal__claim"
            onClick={handleClaim}
            disabled={flying}
          >
            CLAIM
          </button>
        </div>
      </div>

      <CoinFlyToBalance
        active={flying}
        fromRect={flyFromRect}
        onComplete={onFlyComplete}
      />
    </>,
    document.body,
  );
}
