import { buildShareUrl } from './layoutCodec'
import { collectAllVenueLayouts, toStoredJson } from './campusBundle'
import type { LayoutDocument } from '../types/layout'

/** Prefer Phaser editor state when available (background paints sync on pointerup). */
export function resolveLayoutForExport(
  reactLayout: LayoutDocument,
  editorLayout: LayoutDocument | null,
): LayoutDocument {
  return editorLayout ?? reactLayout
}

export async function copyShareLink(layout: LayoutDocument): Promise<string> {
  const url = buildShareUrl(layout)
  await navigator.clipboard.writeText(url)
  return url
}

export function exportLayoutJson(layout: LayoutDocument): void {
  const bundle = collectAllVenueLayouts(layout)
  const json = JSON.stringify(toStoredJson(bundle), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${layout.name.replace(/\s+/g, '_').toLowerCase()}_campus_layout.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCanvasPng(gameCanvas: HTMLCanvasElement, layout: LayoutDocument): void {
  gameCanvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${layout.name.replace(/\s+/g, '_').toLowerCase()}_preview.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
