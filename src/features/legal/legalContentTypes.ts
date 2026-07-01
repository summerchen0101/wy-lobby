export type LegalTableBlock = {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export type LegalActionLinkId = 'openAmoePostalCode'

export type LegalTextSegment =
  | { type: 'text'; text: string }
  | { type: 'actionLink'; text: string; action: LegalActionLinkId }

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'paragraph'; segments: LegalTextSegment[] }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | LegalTableBlock

export type LegalSection = {
  id: string
  title: string
  blocks: LegalBlock[]
}
