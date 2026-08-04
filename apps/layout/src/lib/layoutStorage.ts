import { serializeLayout, parseLayoutJson } from './layoutCodec'
import type { LayoutDocument, VenueId } from '../types/layout'
import { listVenueIds } from '../data/venues'

const DRAFT_PREFIX = 'bonelli_layout_draft_v2_'
const META_KEY = 'bonelli_layout_draft_v2_meta'
const LEGACY_KEY = 'bonelli_layout_draft_v2'

type DraftMeta = {
  lastActiveVenueId: VenueId
  updatedAt: string
}

function draftKey(venueId: VenueId): string {
  return `${DRAFT_PREFIX}${venueId}`
}

function migrateLegacyDraft(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const layout = parseLayoutJson(raw)
    saveVenueDraft(layout.venueId, layout)
    saveDraftMeta(layout.venueId)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    localStorage.removeItem(LEGACY_KEY)
  }
}

export function saveDraftMeta(venueId: VenueId): void {
  try {
    const meta: DraftMeta = { lastActiveVenueId: venueId, updatedAt: new Date().toISOString() }
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* quota / private mode */
  }
}

export function loadDraftMeta(): DraftMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DraftMeta
  } catch {
    return null
  }
}

export function saveVenueDraft(venueId: VenueId, layout: LayoutDocument): void {
  try {
    localStorage.setItem(draftKey(venueId), serializeLayout(layout))
    saveDraftMeta(venueId)
  } catch {
    /* quota / private mode */
  }
}

export function loadVenueDraft(venueId: VenueId): LayoutDocument | null {
  try {
    const raw = localStorage.getItem(draftKey(venueId))
    if (!raw) return null
    return parseLayoutJson(raw)
  } catch {
    return null
  }
}

export function clearVenueDraft(venueId: VenueId): void {
  try {
    localStorage.removeItem(draftKey(venueId))
  } catch {
    /* ignore */
  }
}

export function clearAllVenueDrafts(): void {
  try {
    for (const id of listVenueIds()) {
      localStorage.removeItem(draftKey(id))
    }
    localStorage.removeItem(META_KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

export function hasVenueDraft(venueId: VenueId): boolean {
  return !!localStorage.getItem(draftKey(venueId))
}

export function hasAnyVenueDraft(): boolean {
  migrateLegacyDraft()
  if (localStorage.getItem(META_KEY)) return true
  return listVenueIds().some((id) => hasVenueDraft(id))
}

/** @deprecated use saveVenueDraft */
export function saveLayoutDraft(layout: LayoutDocument): void {
  saveVenueDraft(layout.venueId, layout)
}

/** @deprecated use loadVenueDraft + loadDraftMeta */
export function loadLayoutDraft(): LayoutDocument | null {
  migrateLegacyDraft()
  const meta = loadDraftMeta()
  if (meta) {
    return loadVenueDraft(meta.lastActiveVenueId)
  }
  for (const id of listVenueIds()) {
    const draft = loadVenueDraft(id)
    if (draft) return draft
  }
  return null
}

/** @deprecated use clearAllVenueDrafts */
export function clearLayoutDraft(): void {
  clearAllVenueDrafts()
}

/** @deprecated use hasAnyVenueDraft */
export function hasLayoutDraft(): boolean {
  return hasAnyVenueDraft()
}
