import { useMemo } from 'react'
import { Gift, Home, ShoppingCart, User, Wallet, type LucideIcon } from 'lucide-react'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { isPaymentFeaturesEnabled } from '../../lib/env'
import { useGatewayLobby } from '../../realtime/useGatewayLobby'
import { useWallet } from '../../wallet/walletContext'
import './SessionChrome.css'

type Item = { to: string; label: string; end?: boolean; icon: 'shop' | 'redeem' | 'lobby' | 'promo' | 'profile' }

const ALL_FOOTER_ITEMS: Item[] = [
  { to: '/shop', label: 'SHOP', icon: 'shop' },
  { to: '/redeem', label: 'REDEEM', icon: 'redeem' },
  { to: '/', label: 'LOBBY', end: true, icon: 'lobby' },
  { to: '/promo', label: 'PROMO', icon: 'promo' },
  { to: '/profile', label: 'PROFILE', icon: 'profile' },
]

const footerItems: Item[] = isPaymentFeaturesEnabled()
  ? ALL_FOOTER_ITEMS
  : ALL_FOOTER_ITEMS.filter((i) => i.icon !== 'shop' && i.icon !== 'redeem')

const iconByName: Record<Item['icon'], LucideIcon> = {
  shop: ShoppingCart,
  redeem: Wallet,
  lobby: Home,
  promo: Gift,
  profile: User,
}

function useFooterActiveIndex(items: Item[]): number {
  const { pathname } = useLocation()
  return useMemo(() => {
    for (let i = 0; i < items.length; i += 1) {
      const { to, end } = items[i]
      const p = matchPath(
        { path: to, end: end ?? false, caseSensitive: true },
        pathname
      )
      if (p) return i
    }
    return -1
  }, [pathname, items])
}

export function SessionFooter() {
  const { activeWallet } = useWallet()
  const { refreshLobbyGet } = useGatewayLobby()
  const activeIndex = useFooterActiveIndex(footerItems)
  const tabCount = footerItems.length
  const tabFrac = 1 / tabCount
  return (
    <nav
      className="session-footer"
      data-active-wallet={activeWallet}
      data-footer-active-index={activeIndex}
      style={{
        ['--session-footer-tab-count' as string]: String(tabCount),
        ['--session-footer-tab-frac' as string]: String(tabFrac),
        ...(activeIndex >= 0
          ? { ['--session-footer-active-index' as string]: String(activeIndex) }
          : {}),
      }}
      aria-label="Main navigation"
    >
      <ul className="session-footer__list">
        {footerItems.map(({ to, label, end, icon }) => {
          const Icon = iconByName[icon]
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={() => {
                  void refreshLobbyGet()
                }}
                className={({ isActive }) =>
                  'session-footer__link' + (isActive ? ' is-active' : '')
                }
              >
                <Icon className="session-footer__icon" strokeWidth={2} aria-hidden />
                {label}
              </NavLink>
            </li>
          )
        })}
      </ul>
      <div className="session-footer__slide-track" aria-hidden>
        <div className="session-footer__slide" />
      </div>
    </nav>
  )
}
