import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HEADER_BRAND_LOGO_GC } from '../lib/brandLogos'
import './MarketingTopBar.css'

type NavBtn = { to: string; label: string }

type Props = {
  primary: NavBtn
  secondary?: NavBtn
}

export function MarketingTopBar({ primary, secondary }: Props) {
  const { t } = useTranslation('common')
  return (
    <header className="marketing-top-bar">
      <Link to="/login" className="marketing-top-bar__brand">
        <img
          src={HEADER_BRAND_LOGO_GC}
          alt=""
          className="marketing-top-bar__mark"
          decoding="async"
        />
        <span className="marketing-top-bar__title">{t('brandName')}</span>
      </Link>
      <div className="marketing-top-bar__actions">
        <Link to={primary.to} className="btn-crown-primary">
          {primary.label}
        </Link>
        {secondary ? (
          <Link to={secondary.to} className="btn-crown-secondary">
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </header>
  )
}
