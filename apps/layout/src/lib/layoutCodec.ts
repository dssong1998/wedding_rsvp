import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { LayoutDocument } from '../types/layout'
import { LAYOUT_VERSION } from '../types/layout'
import { migrateLayout, createEmptyLayout } from './layoutMigrate'
import type { VenueId } from '../types/layout'

const URL_PARAM = 'layout'

export function serializeLayout(layout: LayoutDocument): string {
  return JSON.stringify(layout, null, 2)
}

export function parseLayoutJson(json: string): LayoutDocument {
  const parsed = JSON.parse(json) as unknown
  const doc = migrateLayout(parsed)
  validateLayout(doc)
  return doc
}

function validateLayout(doc: LayoutDocument): void {
  if (doc.version !== LAYOUT_VERSION) {
    throw new Error(`Unsupported layout version: ${doc.version}`)
  }
  if (!doc.grid || !doc.background || !doc.items) {
    throw new Error('Invalid layout document')
  }
}

export function encodeLayoutForUrl(layout: LayoutDocument): string {
  return compressToEncodedURIComponent(JSON.stringify(layout))
}

export function decodeLayoutFromUrl(encoded: string): LayoutDocument {
  const json = decompressFromEncodedURIComponent(encoded)
  if (!json) {
    throw new Error('Could not decompress layout from URL')
  }
  return parseLayoutJson(json)
}

export function readLayoutFromLocation(search: string): LayoutDocument | null {
  const params = new URLSearchParams(search)
  const encoded = params.get(URL_PARAM)
  if (!encoded) return null
  try {
    return decodeLayoutFromUrl(encoded)
  } catch {
    return null
  }
}

export function buildShareUrl(layout: LayoutDocument, baseHref?: string): string {
  const base = baseHref ?? window.location.origin + window.location.pathname
  const url = new URL(base, window.location.origin)
  url.searchParams.set(URL_PARAM, encodeLayoutForUrl(layout))
  return url.toString()
}

export function downloadLayoutJson(layout: LayoutDocument, filename?: string): void {
  const blob = new Blob([serializeLayout(layout)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${layout.name.replace(/\s+/g, '_').toLowerCase()}_layout.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importLayoutFromFile(file: File): Promise<LayoutDocument> {
  const text = await file.text()
  return parseLayoutJson(text)
}

export function layoutOrDefault(fromUrl: LayoutDocument | null, venueId: VenueId = 'side_garden'): LayoutDocument {
  return fromUrl ?? createEmptyLayout(venueId)
}
