import type { PlayerAvatarRowDecoded } from '../../realtime/playerAvatarWire'
import { profileAvatarIconUrl } from '../../lib/profileAssets'
import {
  PROFILE_AVATAR_ICONS,
  PROFILE_AVATAR_ITEM_ORDER,
  getProfileAvatarById,
  itemIdFromAvatarUrlField,
  itemIdFromAvatarWireId,
} from './profileAvatars'

export type HeadIconChoice = {
  id: string
  imageSrc: string
  disabled?: boolean
}

const ORDER_INDEX = new Map(
  PROFILE_AVATAR_ITEM_ORDER.map((id, i) => [id, i]),
)

function resolveRowItemId(row: PlayerAvatarRowDecoded): number | undefined {
  const rawId =
    row.avatarID != null && String(row.avatarID).trim() !== ''
      ? String(row.avatarID).trim()
      : ''
  // avatarID 0 = no item; avatarUrl may still carry item ref (e.g. "406@@")
  if (rawId && rawId !== '0') {
    const fromId = itemIdFromAvatarWireId(rawId)
    if (fromId !== undefined) return fromId
  }
  return itemIdFromAvatarUrlField(row.avatarUrl)
}

function mergeChoice(
  existing: HeadIconChoice,
  next: HeadIconChoice,
): HeadIconChoice {
  if (existing.disabled && !next.disabled) return next
  if (!existing.imageSrc && next.imageSrc) {
    return { ...existing, imageSrc: next.imageSrc }
  }
  return existing
}

export function headIconChoicesFromServerRows(
  rows: PlayerAvatarRowDecoded[] | undefined | null,
): HeadIconChoice[] {
  if (!rows?.length) return []
  const byItemId = new Map<string, HeadIconChoice>()
  for (const row of rows) {
    const itemId = resolveRowItemId(row)
    const id = itemId !== undefined ? String(itemId) : ''
    if (!id || id === '0') continue
    const url = typeof row.avatarUrl === 'string' ? row.avatarUrl.trim() : ''
    let imageSrc = ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      imageSrc = url
    } else if (id) {
      imageSrc = getProfileAvatarById(id)?.imageSrc ?? ''
    }
    if (!imageSrc && id) {
      const fallbackIcon = PROFILE_AVATAR_ICONS[0] ?? 'head_1'
      imageSrc = profileAvatarIconUrl(fallbackIcon)
    }
    const st = row.goodState
    const disabled = st === 'UNUSABLE' || st === '3'
    const choice: HeadIconChoice = { id, imageSrc, disabled }
    const prev = byItemId.get(id)
    byItemId.set(id, prev ? mergeChoice(prev, choice) : choice)
  }
  const out = [...byItemId.values()]
  out.sort((a, b) => {
    const na = Number(a.id)
    const nb = Number(b.id)
    const ia = ORDER_INDEX.get(na)
    const ib = ORDER_INDEX.get(nb)
    if (ia !== undefined && ib !== undefined) return ia - ib
    if (ia !== undefined) return -1
    if (ib !== undefined) return 1
    return na - nb
  })
  return out
}
