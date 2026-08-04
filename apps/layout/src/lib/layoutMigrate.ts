import {
  CELL_PX,
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  FINE_CELL_PX,
} from '../config/grid'
import kenneyMap from '../data/kenney-tile-map.json'
import type {
  BackgroundTileRef,
  LayoutDocument,
  LayoutDocumentV1,
  LayoutDocumentV2,
  VenueId,
} from '../types/layout'
import { cellKey, LAYOUT_VERSION } from '../types/layout'

const GRASS_DEFAULT: BackgroundTileRef = {
  sheet: 'rpg',
  index: (kenneyMap as { terrain_grass: { defaultIndex: number } }).terrain_grass.defaultIndex,
}

const COARSE_SCALE = CELL_PX / FINE_CELL_PX

/** 8px fine grid → 16px coarse grid (¼ cell count, same canvas pixels). */
export function downgradeCoarseGrid(doc: LayoutDocumentV2): LayoutDocumentV2 {
  if (doc.grid.cellPx !== FINE_CELL_PX) return doc

  const next = structuredClone(doc)
  const coarseW = Math.floor(doc.grid.width / COARSE_SCALE)
  const coarseH = Math.floor(doc.grid.height / COARSE_SCALE)
  next.grid = {
    cellPx: CELL_PX,
    width: coarseW,
    height: coarseH,
  }

  const defaultTile = doc.background.defaultTile
  const defaultKey = JSON.stringify(defaultTile)
  const newCells: Record<string, BackgroundTileRef> = {}

  for (let cy = 0; cy < coarseH; cy++) {
    for (let cx = 0; cx < coarseW; cx++) {
      const fx = cx * COARSE_SCALE
      const fy = cy * COARSE_SCALE
      const ref = doc.background.cells[cellKey(fx, fy)] ?? defaultTile
      if (JSON.stringify(ref) !== defaultKey) {
        newCells[cellKey(cx, cy)] = ref
      }
    }
  }
  next.background.cells = newCells

  next.items = doc.items.map((item) => ({
    ...item,
    x: Math.round(item.x / COARSE_SCALE),
    y: Math.round(item.y / COARSE_SCALE),
  }))

  next.spawnGroom = {
    x: Math.round(doc.spawnGroom.x / COARSE_SCALE),
    y: Math.round(doc.spawnGroom.y / COARSE_SCALE),
  }
  next.spawnBride = {
    x: Math.round(doc.spawnBride.x / COARSE_SCALE),
    y: Math.round(doc.spawnBride.y / COARSE_SCALE),
  }

  if (doc.portals?.length) {
    next.portals = doc.portals.map((portal) => ({
      ...portal,
      x: Math.floor(portal.x / COARSE_SCALE),
      y: Math.floor(portal.y / COARSE_SCALE),
      w: Math.max(1, Math.round((portal.w ?? 1) / COARSE_SCALE)),
      h: Math.max(1, Math.round((portal.h ?? 1) / COARSE_SCALE)),
    }))
  }

  if (doc.boundary) {
    next.boundary = {
      minX: Math.floor(doc.boundary.minX / COARSE_SCALE),
      minY: Math.floor(doc.boundary.minY / COARSE_SCALE),
      maxX: Math.floor(doc.boundary.maxX / COARSE_SCALE),
      maxY: Math.floor(doc.boundary.maxY / COARSE_SCALE),
    }
  }

  return next
}

export function migrateLayout(doc: unknown): LayoutDocumentV2 {
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid layout document')
  }
  const v = (doc as { version?: number }).version
  let result: LayoutDocumentV2
  if (v === LAYOUT_VERSION) {
    result = doc as LayoutDocumentV2
  } else if (v === 1) {
    result = migrateV1ToV2(doc as LayoutDocumentV1)
  } else {
    throw new Error(`Unsupported layout version: ${v}`)
  }
  return downgradeCoarseGrid(result)
}

function migrateV1ToV2(v1: LayoutDocumentV1): LayoutDocumentV2 {
  const furniture = v1.layers.find((l) => l.id === 'furniture')
  const decoration = v1.layers.find((l) => l.id === 'decoration')
  const items = [
    ...(furniture?.id === 'furniture' ? furniture.items : []),
    ...(decoration?.id === 'decoration' ? decoration.items : []),
  ].map((item) => ({
    ...item,
    rotation: typeof item.rotation === 'number' ? item.rotation : 0,
  }))

  return {
    version: LAYOUT_VERSION,
    name: v1.name,
    venueId: 'side_garden',
    grid: v1.grid,
    background: {
      defaultTile: GRASS_DEFAULT,
      cells: {},
    },
    items,
    spawnGroom: { ...v1.spawn },
    spawnBride: { x: v1.spawn.x + 2, y: v1.spawn.y },
  }
}

export function createEmptyLayout(
  venueId: VenueId,
  partial?: Partial<Pick<LayoutDocument, 'name' | 'grid'>>,
): LayoutDocumentV2 {
  const indoor = venueId === 'main_building_1f' || venueId === 'w_house'
  const defaultTile: BackgroundTileRef = indoor
    ? { sheet: 'indoor', index: kenneyMap.terrain_indoor_floor.defaultIndex }
    : GRASS_DEFAULT

  return {
    version: LAYOUT_VERSION,
    name: partial?.name ?? '보넬리 가든',
    venueId,
    grid: partial?.grid ?? { cellPx: CELL_PX, width: DEFAULT_GRID_WIDTH, height: DEFAULT_GRID_HEIGHT },
    background: { defaultTile, cells: {} },
    items: [],
    spawnGroom: { x: 16, y: 16 },
    spawnBride: { x: 20, y: 16 },
  }
}

export type LayoutDocumentAny = LayoutDocumentV2 | LayoutDocumentV1
