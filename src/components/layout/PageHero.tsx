import type { ReactNode } from 'react'

type PageHeroProps = {
  title: string
  lead: string
  /** Libellé court au-dessus du titre (ex. nom de section). */
  eyebrow?: string
  /** Badges, faits (dl), etc. — affiché à droite sur grand écran. */
  meta?: ReactNode
  /** `id` du titre (accessibilité, ancre). */
  titleId?: string
}

/**
 * En-tête de page : fil d’Ariane visuel, titre, accroche, zone meta optionnelle.
 */
export function PageHero({ title, lead, eyebrow, meta, titleId = 'page-hero-title' }: PageHeroProps) {
  return (
    <header
      className={`dash-page-hero dash-page-hero--pro${meta ? ' dash-page-hero--split' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="dash-page-hero__text">
        {eyebrow ? <p className="dash-page-hero__eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId} className="dash-page-hero__title">
          {title}
        </h1>
        <p className="dash-page-hero__lead">{lead}</p>
      </div>
      {meta ? <div className="dash-page-hero__meta">{meta}</div> : null}
    </header>
  )
}
