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

export function PromoPage() {
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
                    <span className="promo-page__btn promo-page__btn--light">
                      <span className="promo-page__btn-label">{cta}</span>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
