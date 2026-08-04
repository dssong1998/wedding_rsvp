import kenneyMap from '../data/kenney-tile-map.json'
import type { BackgroundTileRef, LayoutDocument } from '../types/layout'
import { cellKey } from '../types/layout'

export function effectiveTile(layout: LayoutDocument, x: number, y: number): BackgroundTileRef {
  return layout.background.cells[cellKey(x, y)] ?? layout.background.defaultTile
}

export function setCell(
  layout: LayoutDocument,
  x: number,
  y: number,
  tile: BackgroundTileRef,
): LayoutDocument {
  const next = structuredClone(layout)
  next.background.cells[cellKey(x, y)] = tile
  return next
}

export function fillRect(
  layout: LayoutDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  tile: BackgroundTileRef,
): LayoutDocument {
  const next = structuredClone(layout)
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      next.background.cells[cellKey(x + dx, y + dy)] = { ...tile }
    }
  }
  return next
}

export function fillGridDefault(layout: LayoutDocument): LayoutDocument {
  const next = structuredClone(layout)
  next.background.cells = {}
  return next
}

const GRASS_VARIANTS = kenneyMap.terrain_grass.variantIndices as number[]
export const GRASS_BASE = kenneyMap.terrain_grass.defaultIndex

/** 배경 수정 모드 — 잔디 칠하기용 단일 타일 (rpg #15) */
export const GRASS_PAINT_INDEX = 15

export function isGrassPaintTile(ref: { sheet: string; index: number }): boolean {
  return ref.sheet === 'rpg' && ref.index === GRASS_PAINT_INDEX
}

export function isGrassAutotileFamily(ref: { sheet: string; index: number }): boolean {
  return ref.sheet === 'rpg' && (ref.index === GRASS_BASE || GRASS_VARIANTS.includes(ref.index))
}

/** Simple grass edge: non-grass neighbor → pick variant by bitmask */
export function autotileGrassCell(
  layout: LayoutDocument,
  x: number,
  y: number,
): BackgroundTileRef {
  const isGrassAt = (tx: number, ty: number) => {
    const t = effectiveTile(layout, tx, ty)
    return isGrassAutotileFamily(t)
  }
  const n = isGrassAt(x, y - 1)
  const s = isGrassAt(x, y + 1)
  const e = isGrassAt(x + 1, y)
  const w = isGrassAt(x - 1, y)
  if (n && s && e && w) {
    return { sheet: 'rpg', index: GRASS_BASE }
  }
  const mask = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0)
  const pick = GRASS_VARIANTS[mask % GRASS_VARIANTS.length] ?? GRASS_BASE
  return { sheet: 'rpg', index: pick }
}

export function paintGrassAutotile(
  layout: LayoutDocument,
  x: number,
  y: number,
): LayoutDocument {
  let next = setCell(layout, x, y, { sheet: 'rpg', index: GRASS_BASE })
  next = setCell(next, x, y, autotileGrassCell(next, x, y))
  for (const [dx, dy] of [
    [0, 0],
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    const tx = x + dx
    const ty = y + dy
    if (tx < 0 || ty < 0 || tx >= next.grid.width || ty >= next.grid.height) continue
    const t = effectiveTile(next, tx, ty)
    if (isGrassAutotileFamily(t)) {
      next = setCell(next, tx, ty, autotileGrassCell(next, tx, ty))
    }
  }
  return next
}

export const PATH_GRAY: BackgroundTileRef = {
  sheet: 'rpg',
  index: kenneyMap.terrain_path_gray.indices[0],
}

export function stampHorizontalPath(
  layout: LayoutDocument,
  y: number,
  x0: number,
  x1: number,
  altEvery = 2,
): LayoutDocument {
  let next = layout
  const lo = Math.min(x0, x1)
  const hi = Math.max(x0, x1)
  for (let x = lo; x <= hi; x++) {
    const idx = kenneyMap.terrain_path_gray.indices[x % altEvery === 0 ? 0 : 1]
    next = setCell(next, x, y, { sheet: 'rpg', index: idx })
  }
  return next
}
