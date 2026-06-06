import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LobbyComplianceFooter } from '../../components/LobbyComplianceFooter'
import { LegalBlockRenderer } from './LegalText'
import { LegalScrollToTop } from './LegalScrollToTop'
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_LAST_REVISED,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
} from './privacyPolicyContent'
import './PrivacyPolicyPage.css'

export function PrivacyPolicyPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Privacy Policy | Wynoco'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="legal-page">
      <header className="legal-page__header page-container">
        <Link className="legal-page__back" to="/">
          ← Back to lobby
        </Link>
        <h1 className="legal-page__title">{PRIVACY_POLICY_TITLE}</h1>
        <p className="legal-page__revised">{PRIVACY_POLICY_LAST_REVISED}</p>
      </header>

      <article className="legal-page__body page-container">
        {PRIVACY_POLICY_INTRO.map((block) => (
          <LegalBlockRenderer key={block.type === 'paragraph' ? block.text : block.type} block={block} />
        ))}

        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="legal-page__section">
            <h2 className="legal-page__section-title">{section.title}</h2>
            {section.blocks.map((block, index) => (
              <LegalBlockRenderer
                key={`${section.id}-${block.type}-${index}`}
                block={block}
              />
            ))}
          </section>
        ))}
      </article>

      <LobbyComplianceFooter variant="guest" />
      <LegalScrollToTop />
    </div>
  )
}
