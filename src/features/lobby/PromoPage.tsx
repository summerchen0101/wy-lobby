import { useCallback, useState, type KeyboardEvent } from 'react'
import { useDailyLoginActivity } from '../dailyLogin/dailyLoginContext'
import { InviteFriendsModal } from './InviteFriendsModal'
import { publicImageUrl } from '../../lib/publicImageUrl'
import './PromoPage.css'
import './SessionPageDecor.css'

const PROMO_BASE = publicImageUrl('/images/promo')

const PROMO_CARDS = [
  {
    id: 'daily',
    title: 'Daily Bonus',
    bg: `${PROMO_BASE}/icon_daily.png`,
    cta: 'CLAIM',
  },
  {
    id: 'invite',
    title: 'Invite Friends',
    bg: `${PROMO_BASE}/icon_invite.png`,
    cta: 'INVITE',
  },
] as const

type PromoCardId = (typeof PROMO_CARDS)[number]['id']

export function PromoPage() {
  const { openModal } = useDailyLoginActivity()
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const onCardAction = useCallback(
    (id: PromoCardId) => {
      if (id === 'invite') {
        setInviteModalOpen(true)
        return
      }
      openModal()
    },
    [openModal],
  )

  const onCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, id: PromoCardId) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onCardAction(id)
      }
    },
    [onCardAction],
  )

  return (
    <section className="promo-page page-container session-page session-page--pattern">
      <div className="promo-page__inner">
        <h1 className="promo-page__title">PROMOTIONS</h1>
        <ul className="promo-page__list">
          {PROMO_CARDS.map(({ id, title, bg, cta }) => (
              <li key={id} className="promo-page__card-slot">
                <div
                  className="promo-page__card"
                  role="button"
                  tabIndex={0}
                  aria-label={title}
                  onClick={() => onCardAction(id)}
                  onKeyDown={(e) => onCardKeyDown(e, id)}
                >
                  <img
                    className="promo-page__card-art"
                    src={bg}
                    alt=""
                    width={1728}
                    height={640}
                    decoding="async"
                  />
                  <div className="promo-page__body">
                    <h2 className="promo-page__h">{title}</h2>
                    <div className="promo-page__actions">
                      <button
                        type="button"
                        className="promo-page__btn promo-page__btn--light"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCardAction(id)
                        }}
                      >
                        <span className="promo-page__btn-label">{cta}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
          ))}
        </ul>
      </div>

      <InviteFriendsModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </section>
  )
}
