import type { ReactNode } from 'react'

function splitBoldSegments(line: string): { bold: boolean; text: string }[] {
  const parts: { bold: boolean; text: string }[] = []
  let rest = line
  while (rest.length > 0) {
    const open = rest.indexOf('**')
    if (open === -1) {
      parts.push({ bold: false, text: rest })
      break
    }
    if (open > 0) parts.push({ bold: false, text: rest.slice(0, open) })
    const close = rest.indexOf('**', open + 2)
    if (close === -1) {
      parts.push({ bold: false, text: rest.slice(open) })
      break
    }
    parts.push({ bold: true, text: rest.slice(open + 2, close) })
    rest = rest.slice(close + 2)
  }
  return parts
}

const mdLink = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

/** Rendu léger **gras** et liens [texte](url) pour les paragraphes légaux. */
export function renderLegalParagraph(line: string): ReactNode {
  const segments: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  const re = new RegExp(mdLink.source, 'g')
  const pushText = (chunk: string) => {
    if (!chunk) return
    for (const { bold, text } of splitBoldSegments(chunk)) {
      if (!text) continue
      segments.push(
        bold ? <strong key={`t-${key++}`}>{text}</strong> : <span key={`t-${key++}`}>{text}</span>,
      )
    }
  }
  while ((m = re.exec(line)) !== null) {
    pushText(line.slice(last, m.index))
    segments.push(
      <a key={`a-${key++}`} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>,
    )
    last = m.index + m[0].length
  }
  pushText(line.slice(last))
  return <>{segments}</>
}
