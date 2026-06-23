import "../../components/alert/AlertProvider.css";

type Props = {
  message: string;
  onRetry: () => void;
};

export function GeoBlockModal({ message, onRetry }: Props) {
  return (
    <div className="app-modal-overlay alert-blocking-overlay" role="presentation">
      <div
        className="app-modal alert-blocking-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="geo-block-title"
        aria-describedby="geo-block-desc"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="app-modal__body alert-blocking-modal__body">
          <h2 id="geo-block-title" className="alert-blocking__sr-only">
            Region notice
          </h2>
          <p id="geo-block-desc" className="alert-blocking-modal__message">
            {message}
          </p>
          <div className="alert-blocking-modal__actions">
            <button
              type="button"
              className="alert-blocking-modal__ok"
              onClick={onRetry}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
