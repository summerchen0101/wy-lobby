import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LobbyComplianceFooter } from '../../components/LobbyComplianceFooter'
import { LegalBlockRenderer } from './LegalText'
import { LegalScrollToTop } from './LegalScrollToTop'
import {
  TERMS_OF_SERVICE_EFFECTIVE,
  TERMS_OF_SERVICE_INTRO,
  TERMS_OF_SERVICE_SECTIONS,
  TERMS_OF_SERVICE_TITLE,
} from './termsOfServiceContent'
import './PrivacyPolicyPage.css'

export function TermsOfServicePage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Terms of Service | LukLok'
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
        <h1 className="legal-page__title">{TERMS_OF_SERVICE_TITLE}</h1>
        <p className="legal-page__revised">{TERMS_OF_SERVICE_EFFECTIVE}</p>
      </header>

      <article className="legal-page__body page-container">
        {TERMS_OF_SERVICE_INTRO.map((block) => (
          <LegalBlockRenderer
            key={block.type === 'paragraph' ? ('text' in block ? block.text : 'segments') : block.type}
            block={block}
          />
        ))}

        {TERMS_OF_SERVICE_SECTIONS.map((section) => (
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
