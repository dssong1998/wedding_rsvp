import { getCatalogItem } from '../config/catalog'
import type { PlacedItem } from '../types/layout'

export function rotatedFootprint(
  widthCells: number,
  heightCells: number,
  rotationDeg: number,
): { w: number; h: number } {
  const swap = rotationDeg === 90 || rotationDeg === 270
  return swap ? { w: heightCells, h: widthCells } : { w: widthCells, h: heightCells }
}

export function itemOccupiesCell(item: PlacedItem, cellX: number, cellY: number): boolean {
  const cat = getCatalogItem(item.assetId)
  const { w, h } = rotatedFootprint(cat.widthCells, cat.heightCells, item.rotation)
  return (
    cellX >= item.x && cellX < item.x + w && cellY >= item.y && cellY < item.y + h
  )
}

export function countSeats(items: PlacedItem[]): number {
  let n = 0
  for (const item of items) {
    try {
      const cat = getCatalogItem(item.assetId)
      if (cat.seats) n += cat.seats
    } catch {
      /* unknown */
    }
  }
  return n
}

export function countChairs(items: PlacedItem[]): number {
  return items.filter((i) => i.assetId === 'chair_wedding').length
}
