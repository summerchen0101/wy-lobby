export type LegalTableBlock = {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | LegalTableBlock

export type LegalSection = {
  id: string
  title: string
  blocks: LegalBlock[]
}
