import type { LayoutDocument } from '../types/layout'
import { cellKey } from '../types/layout'
import { autotileGrassCell, isGrassAutotileFamily, isGrassPaintTile } from './backgroundUtils'

function isGrassTile(ref: { sheet: string; index: number }): boolean {
  return isGrassAutotileFamily(ref) || isGrassPaintTile(ref)
}

/** Apply grass edge autotile to all grass cells (preset load / generated bg). */
export function autotileAllGrass(layout: LayoutDocument): LayoutDocument {
  const next = structuredClone(layout)
  for (let y = 0; y < next.grid.height; y++) {
    for (let x = 0; x < next.grid.width; x++) {
      const ref = next.background.cells[cellKey(x, y)] ?? next.background.defaultTile
      if (!isGrassTile(ref)) continue
      next.background.cells[cellKey(x, y)] = autotileGrassCell(next, x, y)
    }
  }
  return next
}
