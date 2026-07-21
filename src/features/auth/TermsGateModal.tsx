import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWordData } from '../../wordData/useWordData'
import './AuthModals.css'

type Props = {
  open: boolean
  onClose: () => void
  onAccept: () => void
}

export function TermsGateModal({ open, onClose, onAccept }: Props) {
  const w = useWordData()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="app-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="app-modal app-modal--scroll-y auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <button type="button" className="app-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2 id="terms-gate-title" className="app-modal__title">
            {w(13)}
          </h2>
        </div>
        <hr className="app-modal__rule" />
        <div className="app-modal__body">
          <p className="auth-modal__text">
            {w(14)}{' '}
            <a
              className="auth-modal__link"
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              {w(208)}
            </a>{' '}
            &amp;{' '}
            <a
              className="auth-modal__link"
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              {w(209)}
            </a>{' '}
            {w(15)}
          </p>
          <p className="auth-modal__text">{w(16)}</p>
          <div className="auth-modal__accept">
            <button type="button" className="auth-modal__btn-accept" onClick={onAccept}>
              {w(17)}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
