import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useDailyLoginActivity } from '../../features/dailyLogin/dailyLoginContext'
import { useGatewayLobby } from '../../realtime/useGatewayLobby'
import {
  footerIconUrl,
  footerLobbyBumpUrl,
  type FooterIconId,
} from '../../lib/sessionChromeAssets'
import { useWallet } from '../../wallet/walletContext'
import { getWord } from '../../wordData/getWord'
import './SessionChrome.css'

type Item = { to: string; label: string; end?: boolean; icon: FooterIconId }

const footerItems: Item[] = [
  { to: '/shop', label: getWord(100), icon: 'shop' },
  { to: '/redeem', label: getWord(136), icon: 'redeem' },
  { to: '/', label: 'LOBBY', end: true, icon: 'lobby' },
  { to: '/promo', label: 'PROMO', icon: 'promo' },
  { to: '/profile', label: getWord(510750), icon: 'profile' },
]

export function SessionFooter() {
  const { activeWallet } = useWallet()
  const { refreshLobbyGet } = useGatewayLobby()
  const { viewModel } = useDailyLoginActivity()
  const promoClaimable = viewModel?.claimable === true

  const footer = (
    <nav
      className="session-footer"
      data-active-wallet={activeWallet}
      style={
        {
          '--session-footer-lobby-bump': `url("${footerLobbyBumpUrl(activeWallet)}")`,
        } as React.CSSProperties
      }
      aria-label="Main navigation"
    >
      <ul className="session-footer__list">
        {footerItems.map(({ to, label, end, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={
                icon === 'lobby'
                  ? () => {
                      void refreshLobbyGet()
                    }
                  : undefined
              }
              className={({ isActive }) =>
                'session-footer__link' +
                (isActive ? ' is-active' : '') +
                (icon === 'promo' && promoClaimable
                  ? ' session-footer__link--claimable'
                  : '')
              }
            >
              {({ isActive }) => (
                <span className="session-footer__content">
                  <img
                    className="session-footer__icon"
                    src={footerIconUrl(icon, isActive)}
                    alt=""
                    width={56}
                    height={56}
                    decoding="async"
                  />
                  {icon === 'promo' && promoClaimable ? (
                    <span
                      className="session-footer__claim-dot"
                      aria-hidden
                    />
                  ) : null}
                  <span className="session-footer__label">{label}</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )

  if (typeof document === 'undefined') return footer
  return createPortal(footer, document.body)
}
