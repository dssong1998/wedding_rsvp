import manifest from '../../public/assets/tilesets/bonelli_wedding_pixel_pack/manifest.json'
import kenneyMap from '../data/kenney-tile-map.json'
import { getRecommendedTiles } from '../lib/tileLabels'

export type CatalogItemKind = 'bonelli' | 'editor'

export type CatalogItem = {
  assetId: string
  label_ko: string
  kind: CatalogItemKind
  manifestId?: string
  widthCells: number
  heightCells: number
  blocksMovement: boolean
  seats?: number
  interactable?: boolean
  referenceImage?: string
  rotationStep: number
  directions: number[]
}

/** Editor assetId → Bonelli manifest folder id */
export const MANIFEST_ALIASES: Record<string, string> = {
  table_rect_6: '02_table_set_6',
  table_rect_plain: '03_table_rect',
  head_table_round: '04_head_table',
  chair_wedding: '01_chair',
  table_standing: '05_standing_table',
  buffet_station: '06_buffet_table',
  sofa_white_sectional: '07_sofa',
  fountain_3tier: '08_fountain',
  easel_welcome: '09_easel_board',
  pillar_square: '10_column',
  photobooth: '11_photobooth',
  station_welcome_drink: '12_welcome_drink',
  beer_stand: '13_beer_stand',
  wedding_cake: '14_wedding_cake',
  ceremony_circle: '15_center_stage',
  desk_congratulatory: '16_gift_desk',
  wedding_poster: '17_wedding_poster',
  film_camera_table: '18_film_camera_table',
  board_guest: '19_guest_board',
  parasol_planter: '20_parasol_planter',
  character_bride: '21_bride',
  character_groom: '22_groom',
}

const PACK_BASE = '/assets/tilesets/bonelli_wedding_pixel_pack'

type ManifestItem = (typeof manifest.items)[number]

function isCharacterItem(item: ManifestItem): boolean {
  return 'type' in item && item.type === 'character'
}

function manifestDirections(item: ManifestItem): number[] {
  if (isCharacterItem(item)) return [0, 90, 180, 270]
  return item.degrees ?? [0]
}

function manifestById(id: string): ManifestItem | undefined {
  return manifest.items.find((i) => i.id === id)
}

/** Manifest tile footprint in grid cells (display scales with cellPx). */
function cellsFromManifest(item: ManifestItem): { w: number; h: number } {
  const [tw, th] = item.tiles
  return { w: tw * 2, h: th * 2 }
}

function buildBonelliEntry(assetId: string, manifestId: string): CatalogItem | null {
  const item = manifestById(manifestId)
  if (!item) return null
  const { w, h } = cellsFromManifest(item)
  const character = isCharacterItem(item)
  const rotationStep = character ? 90 : item.directions === 8 ? 45 : 90
  return {
    assetId,
    label_ko: item.name,
    kind: 'bonelli',
    manifestId,
    widthCells: w,
    heightCells: h,
    blocksMovement: !character,
    seats: assetId === 'table_rect_6' ? 6 : assetId === 'chair_wedding' ? 1 : undefined,
    interactable: true,
    referenceImage: character ? `${PACK_BASE}/previews/_characters_all.png` : undefined,
    rotationStep,
    directions: manifestDirections(item),
  }
}

const EDITOR_ONLY: CatalogItem[] = [
  {
    assetId: 'spawn_marker_groom',
    label_ko: '신랑 스폰',
    kind: 'editor',
    widthCells: 1,
    heightCells: 1,
    blocksMovement: false,
    rotationStep: 90,
    directions: [0],
  },
  {
    assetId: 'spawn_marker_bride',
    label_ko: '신부 스폰',
    kind: 'editor',
    widthCells: 1,
    heightCells: 1,
    blocksMovement: false,
    rotationStep: 90,
    directions: [0],
  },
]

const catalogMap = new Map<string, CatalogItem>()

for (const [assetId, manifestId] of Object.entries(MANIFEST_ALIASES)) {
  const entry = buildBonelliEntry(assetId, manifestId)
  if (entry) catalogMap.set(assetId, entry)
}

for (const e of EDITOR_ONLY) {
  catalogMap.set(e.assetId, e)
}

export function getCatalogItem(assetId: string): CatalogItem {
  const item = catalogMap.get(assetId)
  if (!item) {
    throw new Error(`Unknown catalog asset: ${assetId}`)
  }
  return item
}

export function listPlacedCatalogItems(): CatalogItem[] {
  return [...catalogMap.values()].filter((c) => c.kind === 'bonelli' || c.assetId.startsWith('spawn_'))
}

export function bonelliSpriteUrl(manifestId: string, rotationDeg: number): string {
  const item = manifestById(manifestId)
  if (!item) throw new Error(`Unknown manifest id: ${manifestId}`)
  if (isCharacterItem(item)) {
    const facing = characterFacingFromRotation(rotationDeg)
    return `${PACK_BASE}/sprites/${manifestId}/${manifestId}_${facing}_idle.png`
  }
  const degrees = item.degrees ?? [0]
  let best = degrees[0]
  let bestDiff = 360
  for (const d of degrees) {
    const diff = Math.abs(((rotationDeg - d + 180) % 360) - 180)
    if (diff < bestDiff) {
      bestDiff = diff
      best = d
    }
  }
  const file = item.files[degrees.indexOf(best)]
  return `${PACK_BASE}/${file}`
}

function characterFacingFromRotation(rotationDeg: number): 'down' | 'up' | 'left' | 'right' {
  const r = ((Math.round(rotationDeg) % 360) + 360) % 360
  if (r === 90) return 'left'
  if (r === 180) return 'up'
  if (r === 270) return 'right'
  return 'down'
}

export function textureKeyForBonelli(manifestId: string, rotationDeg: number): string {
  const item = manifestById(manifestId)
  if (!item) return `bonelli_${manifestId}`
  if (isCharacterItem(item)) {
    const facing = characterFacingFromRotation(rotationDeg)
    const file = `sprites/${manifestId}/${manifestId}_${facing}_idle.png`
    return `bonelli_${file.replace(/\//g, '_').replace('.png', '')}`
  }
  const degrees = item.degrees ?? [0]
  let best = degrees[0]
  let bestDiff = 360
  for (const d of degrees) {
    const diff = Math.abs(((rotationDeg - d + 180) % 360) - 180)
    if (diff < bestDiff) {
      bestDiff = diff
      best = d
    }
  }
  return `bonelli_${manifestId}_r${best}`
}

export const KENNEY_GROOM_INDEX = kenneyMap.character_groom_walk.index
export const KENNEY_BRIDE_INDEX = kenneyMap.character_bride_walk.index

export const RECOMMENDED_TILES = getRecommendedTiles()
