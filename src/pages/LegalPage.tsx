import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { legalBundle } from '../legal/copy'
import { renderLegalParagraph } from '../legal/renderLegalParagraph'

export function LegalPage() {
  const { locale, t } = useI18n()
  const doc = legalBundle[locale]

  return (
    <div className="dash-page legal-page">
      <header className="dash-page-head">
        <h1 className="dash-page-title">{doc.pageTitle}</h1>
        <p className="dash-page-desc">{doc.pageIntro}</p>
        <p className="legal-page__back">
          <Link to="/" className="link-quiet">
            ← {t('legal.backHome')}
          </Link>
        </p>
      </header>

      <nav className="legal-page__toc" aria-label={doc.tocLabel}>
        <ul className="legal-page__toc-list">
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="legal-page__toc-link">
                {s.tocLabel ?? s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className="legal-page__section dash-panel" aria-labelledby={`legal-${section.id}`}>
          <h2 id={`legal-${section.id}`} className="legal-page__section-title">
            {section.title}
          </h2>
          <div className="legal-page__body">
            {section.paragraphs.map((p, i) => (
              <p key={`${section.id}-${i}`} className="legal-page__p">
                {renderLegalParagraph(p)}
              </p>
            ))}
          </div>
        </section>
      ))}

      <p className="legal-page__review legal-page__p">{renderLegalParagraph(doc.reviewNote)}</p>
    </div>
  )
}
