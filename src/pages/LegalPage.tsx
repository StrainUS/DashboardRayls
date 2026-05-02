import { Link } from 'react-router-dom'
import { PageHero } from '../components/layout'
import { useI18n } from '../i18n'
import { legalBundle } from '../legal/copy'
import { renderLegalParagraph } from '../legal/renderLegalParagraph'

export function LegalPage() {
  const { locale, t } = useI18n()
  const doc = legalBundle[locale]

  return (
    <div className="dash-page dash-page--pro legal-page">
      <PageHero
        titleId="legal-page-title"
        eyebrow={t('legal.heroEyebrow')}
        title={doc.pageTitle}
        lead={doc.pageIntro}
        meta={
          <Link to="/" className="link-quiet legal-page__hero-back">
            ← {t('legal.backHome')}
          </Link>
        }
      />

      <div className="dash-page-body legal-page__content">
        <nav className="legal-page__toc" aria-labelledby="legal-toc-title">
          <p id="legal-toc-title" className="legal-page__toc-label">
            {doc.tocLabel}
          </p>
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

        <div className="legal-page__sections">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="legal-page__section dash-panel legal-page__section-panel"
              aria-labelledby={`legal-${section.id}`}
            >
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
        </div>

        <p className="legal-page__review legal-page__p">{renderLegalParagraph(doc.reviewNote)}</p>
      </div>
    </div>
  )
}
