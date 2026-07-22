import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LobbyComplianceFooter } from '../../components/LobbyComplianceFooter'
import { LegalBlockRenderer } from './LegalText'
import { LegalScrollToTop } from './LegalScrollToTop'
import {
  INVITE_FRIENDS_TERMS_EFFECTIVE,
  INVITE_FRIENDS_TERMS_INTRO,
  INVITE_FRIENDS_TERMS_SECTIONS,
} from './inviteFriendsTermsContent'
import { getWord } from '../../wordData/getWord'
import './PrivacyPolicyPage.css'

export function InviteFriendsTermsPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${getWord(212)} | LukLok`
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
        <h1 className="legal-page__title">{getWord(212)}</h1>
        <p className="legal-page__revised">{INVITE_FRIENDS_TERMS_EFFECTIVE}</p>
      </header>

      <article className="legal-page__body page-container">
        {INVITE_FRIENDS_TERMS_INTRO.map((block) => (
          <LegalBlockRenderer
            key={block.type === 'paragraph' ? ('text' in block ? block.text : 'segments') : block.type}
            block={block}
          />
        ))}

        {INVITE_FRIENDS_TERMS_SECTIONS.map((section) => (
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
