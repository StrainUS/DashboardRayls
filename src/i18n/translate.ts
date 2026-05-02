import type { Locale } from './types'

export type MessageTree = { [key: string]: string | MessageTree }

function getLeaf(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.')
  let cur: string | MessageTree | undefined = tree
  for (const p of parts) {
    if (cur == null || typeof cur === 'string') return undefined
    cur = cur[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function createTranslator(messages: MessageTree) {
  return function t(path: string, vars?: Record<string, string | number>): string {
    let s = getLeaf(messages, path)
    if (s === undefined) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] missing: ${path}`)
      }
      return path
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return s
  }
}

export function localeTag(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US'
}
