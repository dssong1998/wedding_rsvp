import Phaser from 'phaser'
import {
  KENNEY_SHEETS,
  indexToRowCol,
  sheetTextureKey,
  stride,
  tileTextureKey,
  type KenneySheetId,
} from '../config/kenneySheets'

export function preloadKenneySheets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const meta of Object.values(KENNEY_SHEETS)) {
    loader.image(sheetTextureKey(meta.id), meta.url)
  }
}

export function ensureTileTexture(
  scene: Phaser.Scene,
  sheet: KenneySheetId,
  index: number,
): string {
  const key = tileTextureKey(sheet, index)
  if (scene.textures.exists(key)) return key

  const meta = KENNEY_SHEETS[sheet]
  const sheetKey = sheetTextureKey(sheet)
  if (!scene.textures.exists(sheetKey)) {
    throw new Error(`Missing Kenney sheet texture: ${sheetKey}`)
  }

  const { row, col } = indexToRowCol(index, meta.cols)
  const s = stride(meta)
  const x = col * s
  const y = row * s

  const source = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement
  const canvas = document.createElement('canvas')
  canvas.width = meta.tileSize
  canvas.height = meta.tileSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d unavailable')
  ctx.drawImage(source, x, y, meta.tileSize, meta.tileSize, 0, 0, meta.tileSize, meta.tileSize)
  scene.textures.addCanvas(key, canvas)
  return key
}

export function preloadBonelliSprites(
  loader: Phaser.Loader.LoaderPlugin,
  manifestItems: { id: string; files: string[] }[],
): void {
  const base = '/assets/tilesets/bonelli_wedding_pixel_pack'
  for (const item of manifestItems) {
    for (const file of item.files) {
      const name = file.replace(/\//g, '_').replace('.png', '')
      loader.image(`bonelli_${name}`, `${base}/${file}`)
    }
  }
}

export function bonelliLoadKeyFromPath(file: string): string {
  return `bonelli_${file.replace(/\//g, '_').replace('.png', '')}`
}
