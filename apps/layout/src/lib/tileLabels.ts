import labels from '../data/tile-labels.json'
import type { KenneySheetId } from '../config/kenneySheets'

export type RecommendedTile = {
  sheet: KenneySheetId
  index: number
  label_ko: string
}

type TileLabelsFile = {
  sheets: Record<KenneySheetId, string>
  recommended: RecommendedTile[]
  tiles: Partial<Record<KenneySheetId, Record<string, string>>>
}

const data = labels as TileLabelsFile

const DEFAULT_SHEET_LABELS: Record<KenneySheetId, string> = {
  rpg: '야외',
  indoor: '실내',
  ui: 'UI',
}

export function getSheetLabel(sheet: KenneySheetId): string {
  return data.sheets[sheet] ?? DEFAULT_SHEET_LABELS[sheet]
}

export function listSheetOptions(): { id: KenneySheetId; label_ko: string }[] {
  return (['rpg', 'indoor', 'ui'] as const).map((id) => ({
    id,
    label_ko: getSheetLabel(id),
  }))
}

export function getTileLabel(sheet: KenneySheetId, index: number): string {
  const custom = data.tiles[sheet]?.[String(index)]
  if (custom) return custom
  return `#${index}`
}

/** Full display label when no custom name is set. */
export function formatTileLabel(sheet: KenneySheetId, index: number): string {
  const custom = data.tiles[sheet]?.[String(index)]
  if (custom) return custom
  return `${getSheetLabel(sheet)} #${index}`
}

export function getRecommendedTiles(): RecommendedTile[] {
  return data.recommended.map((entry) => ({
    sheet: entry.sheet,
    index: entry.index,
    label_ko: entry.label_ko || getTileLabel(entry.sheet, entry.index),
  }))
}

export const TILE_LABELS_PATH = 'apps/layout/src/data/tile-labels.json'
