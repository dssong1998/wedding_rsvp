import { getVenuePreset, ensureVenuePortals, listVenueIds } from '../data/venues'
import { parseLayoutJson } from './layoutCodec'
import { loadVenueDraft, saveVenueDraft } from './layoutStorage'
import { toPresetJson } from './presetJson'
import {
  CAMPUS_BUNDLE_VERSION,
  type CampusLayoutBundle,
  type LayoutDocument,
  type VenueId,
} from '../types/layout'

export function isCampusBundle(value: unknown): value is CampusLayoutBundle {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return obj.version === CAMPUS_BUNDLE_VERSION && typeof obj.venues === 'object' && obj.venues !== null
}

/** Collect every venue (current editor state + per-venue drafts). */
export function collectAllVenueLayouts(current: LayoutDocument): CampusLayoutBundle {
  saveVenueDraft(current.venueId, current)

  const venues = {} as Record<VenueId, LayoutDocument>
  for (const venueId of listVenueIds()) {
    const base =
      venueId === current.venueId
        ? current
        : (loadVenueDraft(venueId) ?? getVenuePreset(venueId))
    const doc = ensureVenuePortals(structuredClone(base))
    doc.name = current.name
    venues[venueId] = doc
  }

  return {
    version: CAMPUS_BUNDLE_VERSION,
    name: current.name,
    activeVenueId: current.venueId,
    venues,
  }
}

/** Restore all venue drafts from a bundle; returns the layout to show in the editor. */
export function applyCampusBundle(bundle: CampusLayoutBundle): LayoutDocument {
  for (const venueId of listVenueIds()) {
    const doc = bundle.venues[venueId]
    if (!doc) continue
    saveVenueDraft(venueId, ensureVenuePortals(structuredClone(doc)))
  }

  const activeId = bundle.activeVenueId
  return loadVenueDraft(activeId) ?? getVenuePreset(activeId)
}

export function applyStoredLayout(raw: unknown): LayoutDocument {
  if (isCampusBundle(raw)) {
    return applyCampusBundle(raw)
  }
  const doc = parseLayoutJson(JSON.stringify(raw))
  saveVenueDraft(doc.venueId, doc)
  return doc
}

export function toStoredJson(bundle: CampusLayoutBundle): object {
  const venues: Record<string, object> = {}
  for (const venueId of listVenueIds()) {
    const doc = bundle.venues[venueId]
    if (doc) venues[venueId] = toPresetJson(doc)
  }
  return {
    version: CAMPUS_BUNDLE_VERSION,
    name: bundle.name,
    activeVenueId: bundle.activeVenueId,
    venues,
  }
}
