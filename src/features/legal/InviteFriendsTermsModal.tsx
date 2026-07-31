import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IoChevronBack } from 'react-icons/io5'
import { LegalBlockRenderer } from './LegalText'
import {
  INVITE_FRIENDS_TERMS_EFFECTIVE,
  INVITE_FRIENDS_TERMS_INTRO,
  INVITE_FRIENDS_TERMS_SECTIONS,
} from './inviteFriendsTermsContent'
import { getWord } from '../../wordData/getWord'
import './InviteFriendsTermsModal.css'
import './PrivacyPolicyPage.css'

type Props = {
  open: boolean
  onClose: () => void
}

export function InviteFriendsTermsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null

  const titleId = 'invite-friends-terms-modal-title'

  return createPortal(
    <div
      className="invite-friends-terms-modal-overlay"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="app-modal app-modal--col invite-friends-terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-modal__head-row invite-friends-terms-modal__header">
          <button type="button" className="app-modal__head-btn" onClick={onClose} aria-label="Back">
            <IoChevronBack aria-hidden />
          </button>
          <h2 id={titleId} className="app-modal__title--abs-center">
            {getWord(212)}
          </h2>
          <div className="app-modal__head-spacer" aria-hidden />
        </header>
        <hr className="app-modal__rule app-modal__rule--flush" />
        <div className="invite-friends-terms-modal__scroll">
          <div className="invite-friends-terms-modal__body">
          <p className="invite-friends-terms-modal__revised">{INVITE_FRIENDS_TERMS_EFFECTIVE}</p>
          {INVITE_FRIENDS_TERMS_INTRO.map((block) => (
            <LegalBlockRenderer
              key={block.type === 'paragraph' ? ('text' in block ? block.text : 'segments') : block.type}
              block={block}
            />
          ))}
          {INVITE_FRIENDS_TERMS_SECTIONS.map((section) => (
            <section key={section.id} className="invite-friends-terms-modal__section">
              <h3 className="invite-friends-terms-modal__section-title">{section.title}</h3>
              {section.blocks.map((block, index) => (
                <LegalBlockRenderer
                  key={`${section.id}-${block.type}-${index}`}
                  block={block}
                />
              ))}
            </section>
          ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
