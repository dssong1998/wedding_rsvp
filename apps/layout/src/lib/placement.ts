import { getCatalogItem } from '../config/catalog'
import { rotatedFootprint } from './footprint'
import type { LayoutDocument, PlacedItem } from '../types/layout'

export function itemFitsInBoundary(
  layout: LayoutDocument,
  item: Pick<PlacedItem, 'assetId' | 'x' | 'y' | 'rotation'>,
): boolean {
  const b = layout.boundary
  if (!b) return true
  const cat = getCatalogItem(item.assetId)
  const { w, h } = rotatedFootprint(cat.widthCells, cat.heightCells, item.rotation)
  if (item.x < b.minX || item.y < b.minY) return false
  if (item.x + w - 1 > b.maxX || item.y + h - 1 > b.maxY) return false
  return true
}

export function clampItemToBoundary(
  layout: LayoutDocument,
  item: PlacedItem,
): PlacedItem {
  const b = layout.boundary
  if (!b) return item
  const cat = getCatalogItem(item.assetId)
  const { w, h } = rotatedFootprint(cat.widthCells, cat.heightCells, item.rotation)
  return {
    ...item,
    x: Math.min(Math.max(item.x, b.minX), Math.max(b.minX, b.maxX - w + 1)),
    y: Math.min(Math.max(item.y, b.minY), Math.max(b.minY, b.maxY - h + 1)),
  }
}
