export type KenneySheetId = 'rpg' | 'indoor' | 'ui'

export type KenneySheetMeta = {
  id: KenneySheetId
  url: string
  tileSize: number
  margin: number
  cols: number
  rows: number
}

/** Grid dimensions derived from Kenney sheet PNG sizes (16px + margin). */
export const KENNEY_SHEETS: Record<KenneySheetId, KenneySheetMeta> = {
  rpg: {
    id: 'rpg',
    url: '/assets/tilesets/kenney_roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png',
    tileSize: 16,
    margin: 1,
    cols: 57,
    rows: 31,
  },
  indoor: {
    id: 'indoor',
    url: '/assets/tilesets/kenney_roguelike-indoors/Tilesheets/roguelikeIndoor_transparent.png',
    tileSize: 16,
    margin: 1,
    cols: 27,
    rows: 17,
  },
  ui: {
    id: 'ui',
    url: '/assets/tilesets/kenney_pixel-ui-pack/Spritesheet/UIpackSheet_transparent.png',
    tileSize: 16,
    margin: 2,
    cols: 30,
    rows: 33,
  },
}

export function sheetTextureKey(sheet: KenneySheetId): string {
  return `kenney_sheet_${sheet}`
}

export function tileTextureKey(sheet: KenneySheetId, index: number): string {
  return `kenney_${sheet}_${index}`
}

export function tileId(sheet: KenneySheetId, index: number): string {
  return `${sheet}:${index}`
}

export function parseTileId(id: string): { sheet: KenneySheetId; index: number } | null {
  const m = /^(\w+):(\d+)$/.exec(id)
  if (!m) return null
  const sheet = m[1] as KenneySheetId
  if (!KENNEY_SHEETS[sheet]) return null
  return { sheet, index: Number(m[2]) }
}

export function stride(meta: KenneySheetMeta): number {
  return meta.tileSize + meta.margin
}

export function indexToRowCol(index: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(index / cols), col: index % cols }
}
