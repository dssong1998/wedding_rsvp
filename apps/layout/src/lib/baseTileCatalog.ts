import { KENNEY_SHEETS, type KenneySheetId, tileId } from '../config/kenneySheets'
import { formatTileLabel, getTileLabel } from './tileLabels'

export type BaseTileEntry = {
  id: string
  sheet: KenneySheetId
  index: number
  label_ko: string
}

let cached: BaseTileEntry[] | null = null

export function getBaseTileCatalog(): BaseTileEntry[] {
  if (cached) return cached
  const list: BaseTileEntry[] = []
  for (const meta of Object.values(KENNEY_SHEETS)) {
    const total = meta.cols * meta.rows
    for (let index = 0; index < total; index++) {
      list.push({
        id: tileId(meta.id, index),
        sheet: meta.id,
        index,
        label_ko: getTileLabel(meta.id, index),
      })
    }
  }
  cached = list
  return list
}

export function filterBaseTiles(sheet?: KenneySheetId, query?: string): BaseTileEntry[] {
  let list = getBaseTileCatalog()
  if (sheet) list = list.filter((t) => t.sheet === sheet)
  if (query?.trim()) {
    const q = query.trim().toLowerCase()
    list = list.filter(
      (t) =>
        t.id.includes(q) ||
        String(t.index).includes(q) ||
        formatTileLabel(t.sheet, t.index).toLowerCase().includes(q),
    )
  }
  return list
}
