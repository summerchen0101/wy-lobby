import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { LobbyComplianceFooter } from '../../components/LobbyComplianceFooter'
import { useAuthModals } from '../auth/authModalsContext'
import { AmoePostalCodeModal } from './AmoePostalCodeModal'
import { LegalBlockRenderer } from './LegalText'
import { LegalScrollToTop } from './LegalScrollToTop'
import type { LegalActionLinkId } from './legalContentTypes'
import {
  SWEEPS_POLICY_EFFECTIVE,
  SWEEPS_POLICY_INTRO,
  SWEEPS_POLICY_SECTIONS,
} from './sweepsPolicyContent'
import { getWord } from '../../wordData/getWord'
import './PrivacyPolicyPage.css'

export function SweepsPolicyPage() {
  const { user } = useAuth()
  const { openLoginDirect } = useAuthModals()
  const [amoeModalOpen, setAmoeModalOpen] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${getWord(210)} | LukLok`
    return () => {
      document.title = previousTitle
    }
  }, [])

  const handleActionLink = useCallback(
    (action: LegalActionLinkId) => {
      if (action === 'openAmoePostalCode') {
        if (!user) {
          openLoginDirect()
          return
        }
        setAmoeModalOpen(true)
      }
    },
    [user, openLoginDirect],
  )

  return (
    <div className="legal-page">
      <header className="legal-page__header page-container">
        <Link className="legal-page__back" to="/">
          ← Back to lobby
        </Link>
        <h1 className="legal-page__title">{getWord(210)}</h1>
        <p className="legal-page__revised">{SWEEPS_POLICY_EFFECTIVE}</p>
      </header>

      <article className="legal-page__body page-container">
        {SWEEPS_POLICY_INTRO.map((block) => (
          <LegalBlockRenderer
            key={block.type === 'paragraph' ? ('text' in block ? block.text : 'segments') : block.type}
            block={block}
            onActionLink={handleActionLink}
          />
        ))}

        {SWEEPS_POLICY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="legal-page__section">
            <h2 className="legal-page__section-title">{section.title}</h2>
            {section.blocks.map((block, index) => (
              <LegalBlockRenderer
                key={`${section.id}-${block.type}-${index}`}
                block={block}
                onActionLink={handleActionLink}
              />
            ))}
          </section>
        ))}
      </article>

      <LobbyComplianceFooter variant="guest" />
      <LegalScrollToTop />
      <AmoePostalCodeModal open={amoeModalOpen} onClose={() => setAmoeModalOpen(false)} />
    </div>
  )
}
