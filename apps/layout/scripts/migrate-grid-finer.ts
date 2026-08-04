#!/usr/bin/env node
/** Rewrite preset JSON files with fine grid (cellPx 8, 2× cell coords). */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseLayoutJson } from '../src/lib/layoutCodec.ts'
import { toPresetJson } from '../src/lib/presetJson.ts'

const presetsDir = resolve('src/data/presets')
const files = readdirSync(presetsDir).filter((f) => f.endsWith('.json'))

for (const file of files) {
  const path = resolve(presetsDir, file)
  const before = JSON.parse(readFileSync(path, 'utf8')) as { grid?: { cellPx?: number; width?: number; height?: number } }
  const layout = parseLayoutJson(readFileSync(path, 'utf8'))
  writeFileSync(path, `${JSON.stringify(toPresetJson(layout), null, 2)}\n`)
  console.log(
    `${file}: cellPx ${before.grid?.cellPx}→${layout.grid.cellPx}, ` +
      `${before.grid?.width}×${before.grid?.height}→${layout.grid.width}×${layout.grid.height}, ` +
      `${Object.keys(layout.background.cells).length} bg cells`,
  )
}
