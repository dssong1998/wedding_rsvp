#!/usr/bin/env node
/** Import a layout JSON file into src/data/presets/{venueId}.json */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseLayoutJson } from '../src/lib/layoutCodec.ts'
import { presetFilename, toPresetJson } from '../src/lib/presetJson.ts'

const input = process.argv[2]
if (!input) {
  console.error('Usage: npm run presets:import -- <path/to/layout.json>')
  process.exit(1)
}

const layout = parseLayoutJson(readFileSync(resolve(input), 'utf8'))
const file = presetFilename(layout.venueId)
const out = resolve(`src/data/presets/${file}`)
writeFileSync(out, `${JSON.stringify(toPresetJson(layout), null, 2)}\n`)
console.log(`Wrote ${out} (${Object.keys(layout.background.cells).length} bg cells)`)
