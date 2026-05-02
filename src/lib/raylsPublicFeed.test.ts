import { describe, expect, it, vi } from 'vitest'

const mockSameOrigin = vi.fn((p: string) => {
  const raw = p.trim().replace(/^\/+/, '')
  return `https://strainus.github.io/DashboardRayls/${raw}`
})

vi.mock('./publicAssetUrl', () => ({
  sameOriginPublicAbsoluteUrl: (p: string) => mockSameOrigin(p),
}))

import { resolveFeedFetchUrl } from './raylsPublicFeed'

describe('resolveFeedFetchUrl', () => {
  it('préfixe BASE_URL via sameOriginPublicAbsoluteUrl pour un fichier public (GitHub Pages)', () => {
    mockSameOrigin.mockClear()
    expect(resolveFeedFetchUrl('/rayls-feed.json')).toBe(
      'https://strainus.github.io/DashboardRayls/rayls-feed.json',
    )
    expect(mockSameOrigin).toHaveBeenCalledWith('/rayls-feed.json')
  })

  it('laisse intacte une URL https absolue', () => {
    mockSameOrigin.mockClear()
    expect(resolveFeedFetchUrl('https://cdn.example.com/feed.json')).toBe('https://cdn.example.com/feed.json')
    expect(mockSameOrigin).not.toHaveBeenCalled()
  })
})
