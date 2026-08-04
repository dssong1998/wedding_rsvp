import { downloadLayoutJson } from './layoutCodec'
import type { LayoutDocument, VenueId } from '../types/layout'

const PRESET_FILE: Record<VenueId, string> = {
  side_garden: 'side_garden.json',
  main_building_1f: 'main_building_1f.json',
  main_garden: 'main_garden.json',
  w_house: 'w_house.json',
  campus_map: 'campus_map.json',
}

export function presetFilename(venueId: VenueId): string {
  return PRESET_FILE[venueId]
}

export function toPresetJson(layout: LayoutDocument): object {
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

export function downloadPresetJson(layout: LayoutDocument): void {
  const preset = toPresetJson(layout) as LayoutDocument
  downloadLayoutJson(preset, presetFilename(layout.venueId))
}

/** Dev: write src/data/presets/*.json. Prod: download preset file. */
export async function saveVenuePreset(layout: LayoutDocument): Promise<'saved' | 'downloaded'> {
  const content = `${JSON.stringify(toPresetJson(layout), null, 2)}\n`
  if (import.meta.env.DEV) {
    const res = await fetch('/api/save-preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: layout.venueId, content }),
    })
    if (res.ok) return 'saved'
  }
  downloadPresetJson(layout)
  return 'downloaded'
}
