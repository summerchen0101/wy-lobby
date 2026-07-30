import { describe, expect, it } from 'vitest'
import { headIconChoicesFromServerRows } from './profileAvatarChoices'

describe('headIconChoicesFromServerRows', () => {
  it('dedupes when avatarID 0 row repeats item id from avatarUrl', () => {
    const rows = [
      { avatarID: '406', avatarUrl: '', goodState: 'IN_ACTIVE' },
      { avatarID: '0', avatarUrl: '406@@', goodState: 'IN_USE' },
    ]
    const choices = headIconChoicesFromServerRows(rows)
    expect(choices).toHaveLength(1)
    expect(choices[0]?.id).toBe('406')
    expect(choices[0]?.disabled).toBe(false)
  })

  it('keeps distinct item ids from server', () => {
    const rows = [
      { avatarID: '401', avatarUrl: '' },
      { avatarID: '406', avatarUrl: '' },
      { avatarID: '493', avatarUrl: '' },
    ]
    const choices = headIconChoicesFromServerRows(rows)
    expect(choices.map((c) => c.id)).toEqual(['401', '406', '493'])
  })
})
