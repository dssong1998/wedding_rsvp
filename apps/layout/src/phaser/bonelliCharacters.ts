import Phaser from 'phaser'
import manifest from '../../public/assets/tilesets/bonelli_wedding_pixel_pack/manifest.json'
import { bonelliLoadKeyFromPath } from './kenneyTiles'

const PACK_BASE = '/assets/tilesets/bonelli_wedding_pixel_pack'

export const BONELLI_CHARACTER_MANIFEST = {
  groom: '22_groom',
  bride: '21_bride',
} as const

export const BONELLI_MC_MANIFEST_ID = '23_mc'

export type McFacing =
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right'
  | 'right'
  | 'down_right'

const MC_FACINGS: McFacing[] = [
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
  'right',
  'down_right',
]

const MC_DEGREES = [0, 45, 90, 135, 180, 225, 270, 315]

export type BonelliCharacterRole = keyof typeof BONELLI_CHARACTER_MANIFEST
export type CharacterFacing = 'down' | 'up' | 'left' | 'right'
export type CharacterFrame = 'idle' | 'walk1' | 'walk2'

/** Sheet rows: down, left, right, up — cols: idle, walk1, walk2 */
const SHEET_FACINGS: CharacterFacing[] = ['down', 'left', 'right', 'up']
const SHEET_FRAMES: CharacterFrame[] = ['idle', 'walk1', 'walk2']

const SHEET_KEYS: Record<BonelliCharacterRole, string> = {
  groom: 'bonelli_char_groom',
  bride: 'bonelli_char_bride',
}

export function isBonelliCharacterManifestId(manifestId: string): boolean {
  return (
    manifestId === BONELLI_CHARACTER_MANIFEST.groom ||
    manifestId === BONELLI_CHARACTER_MANIFEST.bride
  )
}

export function isMcManifestId(manifestId: string): boolean {
  return manifestId === BONELLI_MC_MANIFEST_ID
}

export function mcFacingFromRotation(rotationDeg: number): McFacing {
  const r = ((Math.round(rotationDeg) % 360) + 360) % 360
  let bestIdx = 0
  let bestDiff = 360
  for (let i = 0; i < MC_DEGREES.length; i++) {
    const diff = Math.abs(((r - MC_DEGREES[i] + 180) % 360) - 180)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return MC_FACINGS[bestIdx]
}

export function mcTextureKey(manifestId: string, facing: McFacing): string {
  return bonelliLoadKeyFromPath(`sprites/${manifestId}/${manifestId}_${facing}_idle.png`)
}

export function roleFromManifestId(manifestId: string): BonelliCharacterRole | null {
  if (manifestId === BONELLI_CHARACTER_MANIFEST.groom) return 'groom'
  if (manifestId === BONELLI_CHARACTER_MANIFEST.bride) return 'bride'
  return null
}

export function sheetFrameIndex(facing: CharacterFacing, frame: CharacterFrame): number {
  const row = SHEET_FACINGS.indexOf(facing)
  const col = SHEET_FRAMES.indexOf(frame)
  return row * 3 + col
}

export function characterSpritePath(
  manifestId: string,
  facing: CharacterFacing,
  frame: CharacterFrame,
): string {
  return `sprites/${manifestId}/${manifestId}_${facing}_${frame}.png`
}

export function characterTextureKey(
  manifestId: string,
  facing: CharacterFacing,
  frame: CharacterFrame = 'idle',
): string {
  return bonelliLoadKeyFromPath(characterSpritePath(manifestId, facing, frame))
}

export function rotationToFacing(rotationDeg: number): CharacterFacing {
  const r = ((Math.round(rotationDeg) % 360) + 360) % 360
  if (r === 0) return 'down'
  if (r === 90) return 'left'
  if (r === 180) return 'up'
  if (r === 270) return 'right'
  if (r > 0 && r < 90) return r < 45 ? 'down' : 'left'
  if (r > 90 && r < 180) return r < 135 ? 'left' : 'up'
  if (r > 180 && r < 270) return r < 225 ? 'up' : 'right'
  return r < 315 ? 'right' : 'down'
}

export function velocityToFacing(vx: number, vy: number, fallback: CharacterFacing): CharacterFacing {
  if (Math.abs(vx) > Math.abs(vy)) {
    return vx < 0 ? 'left' : 'right'
  }
  if (Math.abs(vy) > 0.1) {
    return vy < 0 ? 'up' : 'down'
  }
  return fallback
}

export function preloadBonelliCharacterSheets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const role of Object.keys(BONELLI_CHARACTER_MANIFEST) as BonelliCharacterRole[]) {
    const manifestId = BONELLI_CHARACTER_MANIFEST[role]
    const item = manifest.items.find((i) => i.id === manifestId)
    if (!item || !('spritesheet' in item) || !item.spritesheet) continue
    loader.spritesheet(SHEET_KEYS[role], `${PACK_BASE}/${item.spritesheet}`, {
      frameWidth: 32,
      frameHeight: 48,
    })
  }
}

export function createBonelliCharacterAnimations(scene: Phaser.Scene): void {
  for (const role of Object.keys(BONELLI_CHARACTER_MANIFEST) as BonelliCharacterRole[]) {
    const sheetKey = SHEET_KEYS[role]
    if (!scene.textures.exists(sheetKey)) continue
    for (const facing of SHEET_FACINGS) {
      const idleKey = `${role}_idle_${facing}`
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [{ key: sheetKey, frame: sheetFrameIndex(facing, 'idle') }],
          frameRate: 1,
        })
      }
      const walkKey = `${role}_walk_${facing}`
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [
            { key: sheetKey, frame: sheetFrameIndex(facing, 'walk1') },
            { key: sheetKey, frame: sheetFrameIndex(facing, 'idle') },
            { key: sheetKey, frame: sheetFrameIndex(facing, 'walk2') },
            { key: sheetKey, frame: sheetFrameIndex(facing, 'idle') },
          ],
          frameRate: 8,
          repeat: -1,
        })
      }
    }
  }
}

export function playCharacterAnim(
  sprite: Phaser.Physics.Arcade.Sprite,
  role: BonelliCharacterRole,
  facing: CharacterFacing,
  moving: boolean,
): void {
  const animKey = moving ? `${role}_walk_${facing}` : `${role}_idle_${facing}`
  if (sprite.anims.currentAnim?.key !== animKey) {
    sprite.play(animKey, true)
  }
}

export function initialPlayerFrame(): number {
  return sheetFrameIndex('down', 'idle')
}

export function playerSheetKey(role: BonelliCharacterRole): string {
  return SHEET_KEYS[role]
}

export function bonelliCharactersReady(scene: Phaser.Scene): boolean {
  return (
    scene.textures.exists(SHEET_KEYS.groom) && scene.textures.exists(SHEET_KEYS.bride)
  )
}
