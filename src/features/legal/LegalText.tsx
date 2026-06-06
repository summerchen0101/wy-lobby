import type { LegalBlock } from './legalContentTypes'

const LINK_PATTERN =
  /(https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g

function linkifyText(text: string) {
  const parts = text.split(LINK_PATTERN)

  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          className="legal-page__link"
          href={part}
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      )
    }

    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) {
      return (
        <a key={`${part}-${index}`} className="legal-page__link" href={`mailto:${part}`}>
          {part}
        </a>
      )
    }

    return part
  })
}

type LegalBlockRendererProps = {
  block: LegalBlock
}

export function LegalBlockRenderer({ block }: LegalBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      return <p className="legal-page__paragraph">{linkifyText(block.text)}</p>
    case 'subheading':
      return <h3 className="legal-page__subheading">{block.text}</h3>
    case 'list':
      return (
        <ul className="legal-page__list">
          {block.items.map((item) => (
            <li key={item} className="legal-page__list-item">
              {linkifyText(item)}
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="legal-page__table-wrap">
          <table className="legal-page__table">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${row[0]}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}
