#!/usr/bin/env node
/** Rewrite preset JSON: fine grid (8px, 240×170) → coarse grid (16px, 120×85). */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { migrateLayout } from '../src/lib/layoutMigrate.ts'

const presetsDir = resolve('src/data/presets')
const files = readdirSync(presetsDir).filter((f) => f.endsWith('.json'))

function toPresetJson(layout: ReturnType<typeof migrateLayout>): object {
  const doc: Record<string, unknown> = {
    version: layout.version,
    name: layout.name,
    venueId: layout.venueId,
    grid: layout.grid,
    background: layout.background,
    items: layout.items,
    spawnGroom: layout.spawnGroom,
    spawnBride: layout.spawnBride,
  }
  if (layout.boundary) doc.boundary = layout.boundary
  if (layout.lockedItemIds?.length) doc.lockedItemIds = layout.lockedItemIds
  if (layout.portals?.length) doc.portals = layout.portals
  return doc
}

for (const file of files) {
  const path = resolve(presetsDir, file)
  const before = JSON.parse(readFileSync(path, 'utf8')) as {
    grid?: { cellPx?: number; width?: number; height?: number }
  }
  const layout = migrateLayout(JSON.parse(readFileSync(path, 'utf8')))
  writeFileSync(path, `${JSON.stringify(toPresetJson(layout), null, 2)}\n`)
  console.log(
    `${file}: cellPx ${before.grid?.cellPx}→${layout.grid.cellPx}, ` +
      `${before.grid?.width}×${before.grid?.height}→${layout.grid.width}×${layout.grid.height}, ` +
      `${Object.keys(layout.background.cells).length} bg cells`,
  )
}
