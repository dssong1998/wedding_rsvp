import kenneyMap from '../data/kenney-tile-map.json'
import type { BackgroundTileRef } from '../types/layout'

/** Indoor wall cap tiles used in presets (Sample-style proxy). */
export const INDOOR_WALL_INDICES = new Set([
  16, 17, 18, 19, 20, 43, 44, 45, 46, 47, 70, 71, 72,
])

const TREE_INDICES = new Set(kenneyMap.terrain_tree.variantIndices as number[])

export function isTreeTile(ref: BackgroundTileRef): boolean {
  return ref.sheet === 'rpg' && TREE_INDICES.has(ref.index)
}

export function isWalkBlockedTile(ref: BackgroundTileRef): boolean {
  if (ref.sheet === 'indoor' && INDOOR_WALL_INDICES.has(ref.index)) return true
  if (isTreeTile(ref)) return true
  return false
}
