import type { LayoutDocument, VenueId } from '../types/layout'
import { migrateLayout } from '../lib/layoutMigrate'
import { portalsForVenue } from '../config/portals'
import { autotileAllGrass } from '../lib/venueBackground'

import sideGarden from '../data/presets/side_garden.json'
import mainBuilding1f from '../data/presets/main_building_1f.json'
import mainGarden from '../data/presets/main_garden.json'
import wHouse from '../data/presets/w_house.json'
import campusMap from '../data/presets/campus_map.json'

const RAW: Record<VenueId, LayoutDocument> = {
  side_garden: migrateLayout(sideGarden),
  main_building_1f: migrateLayout(mainBuilding1f),
  main_garden: migrateLayout(mainGarden),
  w_house: migrateLayout(wHouse),
  campus_map: migrateLayout(campusMap),
}

export function getVenuePreset(venueId: VenueId): LayoutDocument {
  const layout = structuredClone(RAW[venueId])
  return ensureVenuePortals(autotileAllGrass(layout))
}

export function ensureVenuePortals(layout: LayoutDocument): LayoutDocument {
  if (layout.portals?.length) return layout
  const portals = portalsForVenue(layout.venueId)
  if (portals.length) layout.portals = portals
  return layout
}

export function listVenueIds(): VenueId[] {
  return Object.keys(RAW) as VenueId[]
}
