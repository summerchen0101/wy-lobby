import { Link } from 'react-router-dom'
import { publicImageUrl } from '../lib/publicImageUrl'
import {
  ZENDESK_CONTACT_REQUEST_URL,
  ZENDESK_HELP_CENTER_URL,
} from '../lib/zendeskSupport'
import { getWord } from '../wordData/getWord'
import './LobbyComplianceFooter.css'

const LOGO_SRC = publicImageUrl('/images/compliance/img_logo.png')
const AGE_SRC = publicImageUrl('/images/compliance/icon_21UP.png')

const LINK_COL_A: { href: string; label: string }[] = [
  { href: '/terms', label: getWord(208) },
  { href: '/sweeps', label: getWord(210) },
  { href: '/invite-terms', label: getWord(212) },
  { href: ZENDESK_HELP_CENTER_URL, label: getWord(214) },
]

const LINK_COL_B: { href: string; label: string }[] = [
  { href: '/privacy', label: getWord(209) },
  { href: '/term', label: getWord(211) },
  { href: ZENDESK_CONTACT_REQUEST_URL, label: getWord(213) },
]

const LEGAL_GUEST = getWord(206)
const LEGAL_SESSION = getWord(207)

export type LobbyComplianceFooterProps = {
  variant: 'guest' | 'session'
}

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = /^https?:\/\//i.test(href)

  if (external) {
    return (
      <a
        className="lobby-comp__link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    )
  }

  return (
    <Link className="lobby-comp__link" to={href}>
      {label}
    </Link>
  )
}

export function LobbyComplianceFooter({ variant }: LobbyComplianceFooterProps) {
  const showPurchaseHeadline = variant === 'guest'

  return (
    <footer className="lobby-comp">
      <div className="lobby-comp__inner page-container">
        {showPurchaseHeadline ? (
          <h2 className="lobby-comp__purchase-title">
            NO PURCHASE
            <br />
            NECESSARY!
          </h2>
        ) : null}

        <div className="lobby-comp__tagline-wrap">
          <div className="lobby-comp__tagline-row">
            <span className="lobby-comp__tagline-line" aria-hidden />
            <p className="lobby-comp__tagline">
              <span className="lobby-comp__tagline--green">IT&apos;S ALWAYS </span>
              <span className="lobby-comp__tagline--white">FREE </span>
              <span className="lobby-comp__tagline--green">TO PLAY</span>
            </p>
            <span className="lobby-comp__tagline-line" aria-hidden />
          </div>
          <div className="lobby-comp__tagline-underline" aria-hidden />
        </div>

        <img className="lobby-comp__logo" src={LOGO_SRC} alt="LukLok" width={340} height={108} decoding="async" />

        <p className="lobby-comp__rsp-text">{getWord(205)}</p>

        <Link to="/term" className="lobby-comp__rsp-btn">
          {getWord(204)}
        </Link>

        <div className="lobby-comp__divider" aria-hidden />

        <img
          className="lobby-comp__age"
          src={AGE_SRC}
          alt="21 and older"
          width={64}
          height={64}
          decoding="async"
        />

        <p className="lobby-comp__legal">
          {variant === 'guest' ? LEGAL_GUEST : LEGAL_SESSION}
        </p>

        <nav className="lobby-comp__links" aria-label="Legal and policy links">
          <div className="lobby-comp__links-col">
            {LINK_COL_A.map(({ href, label }) => (
              <FooterLink key={href + label} href={href} label={label} />
            ))}
          </div>
          <div className="lobby-comp__links-col">
            {LINK_COL_B.map(({ href, label }) => (
              <FooterLink key={href + label} href={href} label={label} />
            ))}
          </div>
        </nav>
      </div>
    </footer>
  )
}
