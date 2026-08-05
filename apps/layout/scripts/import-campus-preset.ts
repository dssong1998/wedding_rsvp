#!/usr/bin/env node
/** Import a campus bundle (v3) or single venue JSON into src/data/presets/*.json */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyStoredLayout, isCampusBundle } from '../src/lib/campusBundle.ts'
import { parseLayoutJson } from '../src/lib/layoutCodec.ts'
import { listVenueIds } from '../src/data/venues.ts'
import { presetFilename, toPresetJson } from '../src/lib/presetJson.ts'
import type { VenueId } from '../src/types/layout.ts'

const input = process.argv[2]
const onlyVenue = process.argv[3] as VenueId | undefined

if (!input) {
  console.error('Usage: pnpm presets:import-campus -- <path/to/layout.json> [venueId]')
  console.error('')
  console.error('Examples:')
  console.error('  pnpm presets:import-campus -- docs/dae-da_campus_layout.json campus_map')
  console.error('  pnpm presets:import-campus -- docs/export.json          # all venues in bundle')
  process.exit(1)
}

function writePreset(venueId: VenueId, doc: ReturnType<typeof parseLayoutJson>) {
  const file = presetFilename(venueId)
  const out = resolve(`src/data/presets/${file}`)
  writeFileSync(out, `${JSON.stringify(toPresetJson(doc), null, 2)}\n`)
  console.log(`Wrote ${out} (${Object.keys(doc.background.cells).length} bg cells)`)
}

const raw = JSON.parse(readFileSync(resolve(input), 'utf8')) as unknown

if (isCampusBundle(raw)) {
  const targets = onlyVenue ? [onlyVenue] : listVenueIds()
  let count = 0
  for (const venueId of targets) {
    if (!raw.venues[venueId]) {
      console.warn(`skip ${venueId}: not in bundle`)
      continue
    }
    writePreset(venueId, parseLayoutJson(JSON.stringify(raw.venues[venueId])))
    count++
  }
  console.log(`Done: "${raw.name}" → ${count} preset(s)`)
} else {
  const layout = applyStoredLayout(raw)
  const venueId = onlyVenue ?? layout.venueId
  if (onlyVenue && layout.venueId !== onlyVenue) {
    console.warn(`warn: file venueId=${layout.venueId}, writing to ${onlyVenue}`)
  }
  writePreset(venueId, layout)
}
