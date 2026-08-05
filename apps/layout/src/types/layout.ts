export const LAYOUT_VERSION = 2 as const
export const LAYOUT_VERSION_LEGACY = 1 as const
/** All venues in one saved version (S3 / version history). */
export const CAMPUS_BUNDLE_VERSION = 3 as const

export type VenueId =
  | 'side_garden'
  | 'main_building_1f'
  | 'main_garden'
  | 'w_house'
  | 'campus_map'

export type GridConfig = {
  cellPx: number
  width: number
  height: number
}

export type SpawnPoint = {
  x: number
  y: number
}

export type KenneySheetId = 'rpg' | 'indoor' | 'ui'

export type BackgroundTileRef = {
  sheet: KenneySheetId
  index: number
}

export type PlacedItem = {
  id: string
  assetId: string
  x: number
  y: number
  rotation: number
  easelSlot?: number
}

export type PortalDef = {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  targetVenueId: VenueId
  label_ko?: string
}

export type LayoutDocumentV2 = {
  version: typeof LAYOUT_VERSION
  name: string
  venueId: VenueId
  grid: GridConfig
  background: {
    defaultTile: BackgroundTileRef
    cells: Record<string, BackgroundTileRef>
  }
  items: PlacedItem[]
  spawnGroom: SpawnPoint
  spawnBride: SpawnPoint
  /** Portal zones for venue transitions (campus_map etc.). */
  portals?: PortalDef[]
  /** Inclusive cell bounds for item placement (optional). */
  boundary?: { minX: number; minY: number; maxX: number; maxY: number }
  /** Item ids that cannot move or delete (e.g. pillar). */
  lockedItemIds?: string[]
}

/** @deprecated v1 — migrated on load */
export type LayoutDocumentV1 = {
  version: 1
  name: string
  grid: GridConfig
  layers: [
    { id: 'floor'; tiles: { assetId: string; x: number; y: number }[] },
    { id: 'furniture'; items: PlacedItem[] },
    { id: 'decoration'; items: PlacedItem[] },
  ]
  spawn: SpawnPoint
}

export type LayoutDocument = LayoutDocumentV2

/** Full campus save: every venue layout in one JSON file. */
export type CampusLayoutBundle = {
  version: typeof CAMPUS_BUNDLE_VERSION
  name: string
  activeVenueId: VenueId
  venues: Record<VenueId, LayoutDocument>
}

export type EditorMode = 'edit' | 'walkthrough'

export type WalkRole = 'groom' | 'bride'

export type StampSelection =
  | { kind: 'item'; assetId: string }
  | { kind: 'tile'; sheet: KenneySheetId; index: number }
  | null

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function parseCellKey(key: string): { x: number; y: number } | null {
  const [xs, ys] = key.split(',')
  const x = Number(xs)
  const y = Number(ys)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}
