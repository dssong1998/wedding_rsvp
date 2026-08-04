#!/usr/bin/env node
/**
 * Writes src/data/base-tile-catalog.json from Kenney sheet dimensions.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const sheets = [
  { id: 'rpg', cols: 57, rows: 31 },
  { id: 'indoor', cols: 27, rows: 17 },
  { id: 'ui', cols: 30, rows: 33 },
]

const tiles = []
for (const s of sheets) {
  for (let index = 0; index < s.cols * s.rows; index++) {
    tiles.push({ id: `${s.id}:${index}`, sheet: s.id, index })
  }
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/data/base-tile-catalog.json')
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), tiles }, null, 2))
console.log(`Wrote ${tiles.length} tiles to ${out}`)
