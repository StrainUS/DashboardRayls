import type { ReactNode } from 'react'

type PageHeroProps = {
  title: string
  lead: string
  /** Badges, faits (dl), etc. — affiché à droite sur grand écran. */
  meta?: ReactNode
  /** `id` du titre (accessibilité, ancre). */
  titleId?: string
}

/**
 * En-tête de page aligné sur la vue d’ensemble : titre, accroche, zone meta optionnelle.
 */
export function PageHero({ title, lead, meta, titleId = 'page-hero-title' }: PageHeroProps) {
  return (
    <header
      className={`dash-page-hero${meta ? ' dash-page-hero--split' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="dash-page-hero__text">
        <h1 id={titleId} className="dash-page-hero__title">
          {title}
        </h1>
        <p className="dash-page-hero__lead">{lead}</p>
      </div>
      {meta ? <div className="dash-page-hero__meta">{meta}</div> : null}
    </header>
  )
}
