#!/usr/bin/env node
/** Bake runtime presets (background + portals + enrich) into src/data/presets/*.json */
import { writeFileSync } from 'node:fs'
import { getVenuePreset, listVenueIds } from '../src/data/venues.ts'
import { presetFilename, toPresetJson } from '../src/lib/presetJson.ts'

for (const venueId of listVenueIds()) {
  const layout = getVenuePreset(venueId)
  const file = presetFilename(venueId)
  writeFileSync(`src/data/presets/${file}`, `${JSON.stringify(toPresetJson(layout), null, 2)}\n`)
  console.log(`baked ${file} (${Object.keys(layout.background.cells).length} bg cells)`)
}
