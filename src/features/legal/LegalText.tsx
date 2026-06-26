import type { LegalActionLinkId, LegalBlock, LegalTextSegment } from './legalContentTypes'

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

function renderSegment(
  segment: LegalTextSegment,
  index: number,
  onActionLink?: (action: LegalActionLinkId) => void,
) {
  if (segment.type === 'actionLink') {
    return (
      <button
        key={`action-${index}`}
        type="button"
        className="legal-page__link legal-page__action-link"
        onClick={() => onActionLink?.(segment.action)}
      >
        {segment.text}
      </button>
    )
  }

  return <span key={`text-${index}`}>{linkifyText(segment.text)}</span>
}

type LegalBlockRendererProps = {
  block: LegalBlock
  onActionLink?: (action: LegalActionLinkId) => void
}

export function LegalBlockRenderer({ block, onActionLink }: LegalBlockRendererProps) {
  switch (block.type) {
    case 'paragraph':
      if ('segments' in block) {
        return (
          <p className="legal-page__paragraph">
            {block.segments.map((segment, index) =>
              renderSegment(segment, index, onActionLink),
            )}
          </p>
        )
      }
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
