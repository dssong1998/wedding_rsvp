import Phaser from 'phaser'
import manifest from '../../public/assets/tilesets/bonelli_wedding_pixel_pack/manifest.json'
import {
  MANIFEST_ALIASES,
  getCatalogItem,
  KENNEY_GROOM_INDEX,
  KENNEY_BRIDE_INDEX,
} from '../config/catalog'
import { itemOccupiesCell, rotatedFootprint } from '../lib/footprint'
import { effectiveTile, fillRect, GRASS_BASE, GRASS_PAINT_INDEX, isGrassPaintTile } from '../lib/backgroundUtils'
import { isTreeTile } from '../lib/walkability'
import { clampItemToBoundary, itemFitsInBoundary } from '../lib/placement'
import { isWalkBlockedTile } from '../lib/walkability'
import type {
  EditorMode,
  LayoutDocument,
  PlacedItem,
  PortalDef,
  StampSelection,
  VenueId,
  WalkRole,
} from '../types/layout'
import { isTextInputFocused } from '../lib/focusUtils'
import { cellKey } from '../types/layout'
import { bindPhaserBridge, cloneLayout } from './bridge'
import {
  bonelliLoadKeyFromPath,
  ensureTileTexture,
  preloadBonelliSprites,
  preloadKenneySheets,
} from './kenneyTiles'
import {
  bonelliCharactersReady,
  characterTextureKey,
  createBonelliCharacterAnimations,
  initialPlayerFrame,
  playCharacterAnim,
  playerSheetKey,
  preloadBonelliCharacterSheets,
  rotationToFacing,
  sheetFrameIndex,
  type CharacterFacing,
  velocityToFacing,
} from './bonelliCharacters'

const GRID_COLOR = 0x334155
const GRID_ALPHA = 0.35
const SELECT_STROKE = 0xfbbf24
const PAN_THRESHOLD = 6
/** 배경 수정 모드 — 클릭/드래그 구분 감도 (기본 대비 2배) */
const BG_EDIT_PAN_THRESHOLD = 3
const PORTAL_COLOR = 0x38bdf8
const PORTAL_COOLDOWN_MS = 900

export class LayoutScene extends Phaser.Scene {
  private layout!: LayoutDocument
  private mode: EditorMode = 'edit'
  private walkRole: WalkRole = 'groom'
  private backgroundEdit = false
  private stamp: StampSelection = null
  private continuousPlacement = false
  private selectedIds = new Set<string>()
  private selectedPortalId: string | null = null
  private itemSprites = new Map<string, Phaser.GameObjects.Image>()
  private collisionGroup!: Phaser.Physics.Arcade.StaticGroup
  private wallCollisionGroup!: Phaser.Physics.Arcade.StaticGroup
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private backgroundContainer!: Phaser.GameObjects.Container
  private defaultGround: Phaser.GameObjects.TileSprite | null = null
  private gridGraphics!: Phaser.GameObjects.Graphics
  private boundaryGraphics: Phaser.GameObjects.Graphics | null = null
  private selectionGraphics!: Phaser.GameObjects.Graphics
  private layoutListeners = new Set<
    (payload: { layout: LayoutDocument; reason: LayoutChangePayloadReason }) => void
  >()
  private selectionListeners = new Set<(ids: string[]) => void>()
  private stampListeners = new Set<(stamp: StampSelection) => void>()
  private portalListeners = new Set<(targetVenueId: VenueId) => void>()
  private portalSelectionListeners = new Set<(id: string | null) => void>()
  private portalLayer!: Phaser.GameObjects.Container
  private portalCooldownUntil = 0
  private dragItemId: string | null = null
  private dragGroupOrigins: Map<string, { x: number; y: number }> | null = null
  private dragPortalId: string | null = null
  private dragPortalOffset = { x: 0, y: 0 }
  private dragOffset = { x: 0, y: 0 }
  private panActive = false
  private panEligible = false
  private panStart = { x: 0, y: 0, scrollX: 0, scrollY: 0 }
  private pointerDownCell: { x: number; y: number } | null = null
  private paintDragging = false
  private paintIncremental = false
  private lastPaintCell: { x: number; y: number } | null = null
  private cellImages = new Map<string, Phaser.GameObjects.GameObject[]>()
  private fillDragging = false
  private fillAnchorCell: { x: number; y: number } | null = null
  private fillEndCell: { x: number; y: number } | null = null
  private fillPreviewGraphics!: Phaser.GameObjects.Graphics
  private pendingPortalDragId: string | null = null
  private portalDragOrigin: { x: number; y: number } | null = null
  private pendingPortalClickTarget: VenueId | null = null
  private portalClickStart: { x: number; y: number } | null = null
  private bonelliPlayerReady = false
  private playerFacing: CharacterFacing = 'down'
  private interactHint: Phaser.GameObjects.Text | null = null

  constructor() {
    super({ key: 'LayoutScene' })
  }

  preload() {
    preloadKenneySheets(this.load)
    preloadBonelliSprites(this.load, manifest.items)
    preloadBonelliCharacterSheets(this.load)
  }

  create() {
    this.layout = cloneLayout(this.registry.get('initialLayout'))
    this.bonelliPlayerReady = bonelliCharactersReady(this)
    this.collisionGroup = this.physics.add.staticGroup()
    this.wallCollisionGroup = this.physics.add.staticGroup()

    const { width, height, cellPx } = this.layout.grid
    this.updateCameraBounds()
    this.cameras.main.setZoom(1.5)
    this.cameras.main.centerOn((width * cellPx) / 2, (height * cellPx) / 2)

    this.scale.on('resize', () => {
      this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height)
    })

    this.backgroundContainer = this.add.container(0, 0).setDepth(-10)
    this.gridGraphics = this.add.graphics()
    this.selectionGraphics = this.add.graphics().setDepth(100)
    this.fillPreviewGraphics = this.add.graphics().setDepth(101)

    this.rebuildBackground()
    this.rebuildWallCollision()
    this.drawGrid()
    this.drawBoundary()
    this.rebuildItems()
    this.createPlayer()
    this.rebuildPortals()
    if (this.bonelliPlayerReady) {
      createBonelliCharacterAnimations(this)
    }
    this.setupInput()
    this.bindBridge()
    this.applyModeVisuals()
  }

  private rebuildBackground() {
    this.backgroundContainer.removeAll(true)
    this.cellImages.clear()
    if (this.defaultGround) {
      this.defaultGround.destroy()
      this.defaultGround = null
    }

    const { width, height, cellPx } = this.layout.grid
    const def = this.layout.background.defaultTile
    const groundTile = isTreeTile(def) ? { sheet: 'rpg' as const, index: GRASS_BASE } : def
    try {
      const defKey = ensureTileTexture(this, groundTile.sheet, groundTile.index)
      this.defaultGround = this.add
        .tileSprite(0, 0, width * cellPx, height * cellPx, defKey)
        .setOrigin(0)
        .setDepth(-11)
      this.backgroundContainer.add(this.defaultGround)
    } catch {
      /* ui sheet missing etc. */
    }

    const defaultKey = `${groundTile.sheet}:${groundTile.index}`
    for (const [key, ref] of Object.entries(this.layout.background.cells)) {
      const refKey = `${ref.sheet}:${ref.index}`
      if (refKey === defaultKey && !isTreeTile(ref)) continue
      const [xs, ys] = key.split(',')
      const x = Number(xs)
      const y = Number(ys)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      try {
        this.mountBackgroundCell(x, y, ref, cellPx)
      } catch {
        /* skip */
      }
    }
  }

  private mountBackgroundCell(
    x: number,
    y: number,
    ref: { sheet: 'rpg' | 'indoor' | 'ui'; index: number },
    cellPx: number,
  ) {
    const imgs = this.createBackgroundCellImages(x, y, ref, cellPx)
    if (!imgs.length) return
    this.cellImages.set(cellKey(x, y), imgs)
    for (const img of imgs) this.backgroundContainer.add(img)
  }

  private refreshBackgroundCellAt(x: number, y: number) {
    const key = cellKey(x, y)
    const old = this.cellImages.get(key)
    if (old) {
      for (const img of old) img.destroy()
      this.cellImages.delete(key)
    }

    const { width, height, cellPx } = this.layout.grid
    if (x < 0 || y < 0 || x >= width || y >= height) return

    const def = this.layout.background.defaultTile
    const groundTile = isTreeTile(def) ? { sheet: 'rpg' as const, index: GRASS_BASE } : def
    const defaultKey = `${groundTile.sheet}:${groundTile.index}`
    const ref = effectiveTile(this.layout, x, y)
    const refKey = `${ref.sheet}:${ref.index}`
    if (refKey === defaultKey && !isTreeTile(ref)) return

    try {
      this.mountBackgroundCell(x, y, ref, cellPx)
    } catch {
      /* skip */
    }
  }

  private createBackgroundCellImages(
    x: number,
    y: number,
    ref: { sheet: 'rpg' | 'indoor' | 'ui'; index: number },
    cellPx: number,
  ): Phaser.GameObjects.Image[] {
    const cx = x * cellPx + cellPx / 2
    const cy = y * cellPx + cellPx / 2
    const imgs: Phaser.GameObjects.Image[] = []
    if (isTreeTile(ref)) {
      const grassKey = ensureTileTexture(this, 'rpg', GRASS_BASE)
      imgs.push(this.add.image(cx, cy, grassKey).setOrigin(0.5))
    }
    const tex = ensureTileTexture(this, ref.sheet, ref.index)
    imgs.push(this.add.image(cx, cy, tex).setOrigin(0.5))
    return imgs
  }

  private drawBoundary() {
    if (this.boundaryGraphics) {
      this.boundaryGraphics.destroy()
      this.boundaryGraphics = null
    }
    const b = this.layout.boundary
    if (!b) return
    const cellPx = this.layout.grid.cellPx
    this.boundaryGraphics = this.add.graphics().setDepth(99)
    this.boundaryGraphics.lineStyle(2, 0x22c55e, 0.45)
    this.boundaryGraphics.strokeRect(
      b.minX * cellPx,
      b.minY * cellPx,
      (b.maxX - b.minX + 1) * cellPx,
      (b.maxY - b.minY + 1) * cellPx,
    )
  }

  private drawGrid() {
    const { width, height, cellPx } = this.layout.grid
    this.gridGraphics.clear()
    this.gridGraphics.lineStyle(1, GRID_COLOR, GRID_ALPHA)
    for (let x = 0; x <= width; x++) {
      this.gridGraphics.lineBetween(x * cellPx, 0, x * cellPx, height * cellPx)
    }
    for (let y = 0; y <= height; y++) {
      this.gridGraphics.lineBetween(0, y * cellPx, width * cellPx, y * cellPx)
    }
  }

  private rebuildWallCollision() {
    this.wallCollisionGroup.clear(true, true)
    const { width, height, cellPx } = this.layout.grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ref = effectiveTile(this.layout, x, y)
        if (!isWalkBlockedTile(ref)) continue
        try {
          const key = ensureTileTexture(this, ref.sheet, ref.index)
          const body = this.wallCollisionGroup.create(
            x * cellPx + cellPx / 2,
            y * cellPx + cellPx / 2,
            key,
          ) as Phaser.Physics.Arcade.Sprite
          body.setVisible(false)
          body.setDisplaySize(cellPx, cellPx)
          body.refreshBody()
        } catch {
          /* skip */
        }
      }
    }
  }

  private spawnMarkerLayer!: Phaser.GameObjects.Container

  private rebuildItems() {
    this.itemSprites.forEach((s) => s.destroy())
    this.itemSprites.clear()
    this.collisionGroup.clear(true, true)

    for (const item of this.layout.items) {
      if (item.assetId.startsWith('spawn_marker_')) continue
      this.spawnItemSprite(item)
    }
    this.rebuildSpawnMarkers()
    this.refreshSelectionOutline()
  }

  private rebuildSpawnMarkers() {
    if (!this.spawnMarkerLayer) {
      this.spawnMarkerLayer = this.add.container(0, 0).setDepth(8)
    }
    this.spawnMarkerLayer.removeAll(true)
    if (this.mode === 'walkthrough') return

    const cellPx = this.layout.grid.cellPx
    const drawSpawn = (x: number, y: number, manifestId: string) => {
      const key = characterTextureKey(manifestId, 'down', 'idle')
      if (this.textures.exists(key)) {
        this.spawnMarkerLayer.add(
          this.add
            .image(x * cellPx + cellPx / 2, y * cellPx + cellPx * 0.85, key)
            .setOrigin(0.5, 0.85)
            .setAlpha(0.85),
        )
        return
      }
      try {
        const index = manifestId === '22_groom' ? KENNEY_GROOM_INDEX : KENNEY_BRIDE_INDEX
        const kenneyKey = ensureTileTexture(this, 'rpg', index)
        this.spawnMarkerLayer.add(
          this.add
            .image(x * cellPx + cellPx / 2, y * cellPx + cellPx / 2, kenneyKey)
            .setOrigin(0.5)
            .setAlpha(0.85),
        )
      } catch {
        /* skip */
      }
    }
    drawSpawn(this.layout.spawnGroom.x, this.layout.spawnGroom.y, '22_groom')
    drawSpawn(this.layout.spawnBride.x, this.layout.spawnBride.y, '21_bride')
  }

  private rebuildPortals() {
    if (!this.portalLayer) {
      this.portalLayer = this.add.container(0, 0).setDepth(7)
    }
    this.portalLayer.removeAll(true)
    const portals = this.layout.portals
    if (!portals?.length) return

    const cellPx = this.layout.grid.cellPx
    for (const portal of portals) {
      const w = portal.w ?? 1
      const h = portal.h ?? 1
      const px = portal.x * cellPx
      const py = portal.y * cellPx
      const pw = w * cellPx
      const ph = h * cellPx

      const gfx = this.add.graphics()
      gfx.fillStyle(PORTAL_COLOR, 0.22)
      gfx.fillRect(px, py, pw, ph)
      gfx.lineStyle(2, PORTAL_COLOR, 0.65)
      gfx.strokeRect(px + 1, py + 1, pw - 2, ph - 2)
      this.portalLayer.add(gfx)

      if (portal.label_ko) {
        const label = this.add
          .text(px + pw / 2, py + ph / 2, portal.label_ko, {
            fontSize: '11px',
            color: '#e0f2fe',
            backgroundColor: '#0c4a6eaa',
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5)
        this.portalLayer.add(label)
      }

      const zone = this.add.zone(px + pw / 2, py + ph / 2, pw, ph).setInteractive({
        useHandCursor: true,
      })
      zone.setData('portalId', portal.id)
      zone.setData('targetVenueId', portal.targetVenueId)
      zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.mode === 'edit' && this.backgroundEdit) {
          if (this.isShiftDown(pointer)) return
          this.beginPortalSelect(portal, pointer)
        }
      })
      zone.on('pointerup', () => {
        const navigate =
          this.mode === 'walkthrough' || (this.mode === 'edit' && !this.backgroundEdit)
        if (navigate) this.triggerPortal(portal.targetVenueId)
      })
      this.portalLayer.add(zone)
    }
  }

  private hasPortals(): boolean {
    return (this.layout.portals?.length ?? 0) > 0
  }

  private triggerPortal(targetVenueId: VenueId) {
    const now = this.time.now
    if (now < this.portalCooldownUntil) return
    this.portalCooldownUntil = now + PORTAL_COOLDOWN_MS
    this.portalListeners.forEach((l) => l(targetVenueId))
  }

  /** 편집(포털 탐색) / 동선 점검 모드에서 포털 클릭 시작 */
  private tryBeginPortalClick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.hasPortals()) return false
    const navigate =
      this.mode === 'walkthrough' || (this.mode === 'edit' && !this.backgroundEdit)
    if (!navigate) return false

    const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
    const portal = this.hitTestPortal(cell.x, cell.y)
    if (!portal) return false

    this.pendingPortalClickTarget = portal.targetVenueId
    this.portalClickStart = { x: pointer.x, y: pointer.y }
    return true
  }

  private tryFinishPortalClick(pointer: Phaser.Input.Pointer) {
    if (!this.pendingPortalClickTarget || !this.portalClickStart) return
    const moved =
      Math.abs(pointer.x - this.portalClickStart.x) > PAN_THRESHOLD ||
      Math.abs(pointer.y - this.portalClickStart.y) > PAN_THRESHOLD
    if (!moved) {
      this.triggerPortal(this.pendingPortalClickTarget)
    }
    this.pendingPortalClickTarget = null
    this.portalClickStart = null
  }

  private checkPortalOverlap() {
    if (!this.hasPortals()) return
    const cellPx = this.layout.grid.cellPx
    const cellX = Math.floor(this.player.x / cellPx)
    const cellY = Math.floor(this.player.y / cellPx)
    for (const portal of this.layout.portals ?? []) {
      const w = portal.w ?? 1
      const h = portal.h ?? 1
      if (
        cellX >= portal.x &&
        cellX < portal.x + w &&
        cellY >= portal.y &&
        cellY < portal.y + h
      ) {
        this.triggerPortal(portal.targetVenueId)
        return
      }
    }
  }

  private emitStampChange() {
    this.stampListeners.forEach((l) => l(this.stamp))
  }

  private clearStampAfterPlace() {
    if (this.continuousPlacement) return
    this.stamp = null
    this.emitStampChange()
  }

  private spawnItemSprite(item: PlacedItem) {
    const cat = getCatalogItem(item.assetId)
    const manifestId = MANIFEST_ALIASES[item.assetId]
    if (!manifestId) return

    const manifestItem = manifest.items.find((m) => m.id === manifestId)
    if (!manifestItem) return

    const isCharacter = 'type' in manifestItem && manifestItem.type === 'character'
    let key: string
    if (isCharacter) {
      const facing = rotationToFacing(item.rotation)
      key = characterTextureKey(manifestId, facing, 'idle')
    } else {
      const degrees = manifestItem.degrees ?? [0]
      let bestDeg = degrees[0]
      let bestDiff = 360
      for (const d of degrees) {
        const diff = Math.abs(((item.rotation - d + 180) % 360) - 180)
        if (diff < bestDiff) {
          bestDiff = diff
          bestDeg = d
        }
      }
      const fileIdx = degrees.indexOf(bestDeg)
      const file = manifestItem.files[fileIdx]
      key = bonelliLoadKeyFromPath(file)
    }
    if (!this.textures.exists(key)) return

    const { w, h } = rotatedFootprint(cat.widthCells, cat.heightCells, item.rotation)
    const cellPx = this.layout.grid.cellPx
    const cx = item.x * cellPx + (w * cellPx) / 2
    const cy = isCharacter
      ? item.y * cellPx + h * cellPx * 0.85
      : item.y * cellPx + (h * cellPx) / 2

    const sprite = this.add
      .image(cx, cy, key)
      .setOrigin(0.5, isCharacter ? 0.85 : 0.5)
      .setDepth(10 + cy)
      .setInteractive({ useHandCursor: true })
    sprite.setData('itemId', item.id)
    this.itemSprites.set(item.id, sprite)

    if (cat.blocksMovement) {
      const body = this.collisionGroup.create(cx, cy, key) as Phaser.Physics.Arcade.Sprite
      body.setVisible(false)
      body.setDisplaySize(w * cellPx, h * cellPx)
      body.refreshBody()
    }
  }

  private createPlayer() {
    const spawn = this.layout.spawnGroom
    const { grid } = this.layout
    const px = spawn.x * grid.cellPx + grid.cellPx / 2
    const py = spawn.y * grid.cellPx + grid.cellPx * 0.85

    if (this.bonelliPlayerReady) {
      const key = playerSheetKey('groom')
      this.player = this.physics.add.sprite(px, py, key, initialPlayerFrame())
      this.player.setOrigin(0.5, 0.85)
    } else {
      const key = ensureTileTexture(this, 'rpg', KENNEY_GROOM_INDEX)
      this.player = this.physics.add.sprite(px, py, key)
      this.player.setOrigin(0.5, 0.5)
    }

    this.playerFacing = 'down'
    this.updatePlayerSprite()
    this.player.setDepth(50)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.collisionGroup)
    this.physics.add.collider(this.player, this.wallCollisionGroup)
    this.player.setVisible(false)
  }

  private updateCameraBounds() {
    const { width, height, cellPx } = this.layout.grid
    this.cameras.main.setBounds(0, 0, width * cellPx, height * cellPx)
  }

  private applyCameraPan(dx: number, dy: number) {
    const cam = this.cameras.main
    const z = cam.zoom
    cam.scrollX = this.panStart.scrollX - dx / z
    cam.scrollY = this.panStart.scrollY - dy / z
  }

  private beginPanTracking(pointer: Phaser.Input.Pointer) {
    this.panStart = {
      x: pointer.x,
      y: pointer.y,
      scrollX: this.cameras.main.scrollX,
      scrollY: this.cameras.main.scrollY,
    }
    this.panActive = false
    this.panEligible = false
  }

  private setupInput() {
    this.input.mouse?.disableContextMenu()
    const canvas = this.game.canvas
    canvas.style.touchAction = 'none'
    canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.beginPanTracking(pointer)
      this.pointerDownCell = this.pointerToCell(pointer.worldX, pointer.worldY)
      this.paintDragging = false
      this.fillDragging = false
      this.pendingPortalDragId = null
      this.portalDragOrigin = null
      this.pendingPortalClickTarget = null
      this.portalClickStart = null

      if (this.mode === 'walkthrough') {
        this.tryBeginPortalClick(pointer)
        return
      }

      // Middle mouse — immediate free pan
      if (pointer.middleButtonDown()) {
        this.panEligible = true
        this.panActive = true
        return
      }

      if (this.backgroundEdit) {
        const cell = this.pointerDownCell

        if (!this.isShiftDown(pointer)) {
          const portal = this.hitTestPortal(cell.x, cell.y)
          if (portal) {
            this.beginPortalSelect(portal, pointer)
            return
          }
        }

        if (this.handleEditItemPointerDown(cell, pointer)) {
          return
        }

        if (this.stamp?.kind === 'item') {
          this.selectedPortalId = null
          this.refreshSelectionOutline()
          this.emitPortalSelection()
          this.panEligible = true
          return
        }

        if (this.stamp?.kind === 'tile') {
          if (this.isShiftDown(pointer)) {
            this.fillDragging = true
            this.fillAnchorCell = { ...cell }
            this.fillEndCell = { ...cell }
            this.drawFillPreview(cell.x, cell.y, cell.x, cell.y)
            return
          }
          this.paintCell(cell.x, cell.y, true)
          this.paintDragging = true
          return
        }

        this.selectedPortalId = null
        this.dragPortalId = null
        this.clearItemSelection()
        this.refreshSelectionOutline()
        this.emitPortalSelection()
        this.emitSelection()
        this.panEligible = true
        return
      }

      if (this.mode !== 'edit') return

      if (this.tryBeginPortalClick(pointer)) {
        this.clearItemSelection()
        this.refreshSelectionOutline()
        this.emitSelection()
        return
      }

      if (this.stamp?.kind === 'item') {
        this.panEligible = true
        return
      }

      const cell = this.pointerDownCell
      if (this.handleEditItemPointerDown(cell, pointer)) {
        return
      }
      if (!this.isShiftDown(pointer)) {
        this.clearItemSelection()
        this.panEligible = true
        this.refreshSelectionOutline()
        this.emitSelection()
      } else {
        this.panEligible = true
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return

      if (this.mode === 'walkthrough') return

      const dx = pointer.x - this.panStart.x
      const dy = pointer.y - this.panStart.y

      if (this.backgroundEdit && this.fillDragging && this.fillAnchorCell) {
        const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
        this.fillEndCell = { ...cell }
        this.drawFillPreview(
          this.fillAnchorCell.x,
          this.fillAnchorCell.y,
          cell.x,
          cell.y,
        )
        return
      }

      if (this.backgroundEdit && this.paintDragging && this.stamp?.kind === 'tile') {
        const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
        this.paintCell(cell.x, cell.y, true)
        return
      }

      if (this.backgroundEdit) {
        const overThreshold =
          Math.abs(dx) > BG_EDIT_PAN_THRESHOLD || Math.abs(dy) > BG_EDIT_PAN_THRESHOLD

        if (this.dragItemId) {
          this.handleItemGroupDrag(pointer)
          return
        }

        if (this.pendingPortalDragId && overThreshold) {
          this.dragPortalId = this.pendingPortalDragId
        }
        if (this.dragPortalId) {
          const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
          const portal = this.findPortal(this.dragPortalId)
          if (portal) {
            const nx = cell.x - this.dragPortalOffset.x
            const ny = cell.y - this.dragPortalOffset.y
            if (portal.x !== nx || portal.y !== ny) {
              portal.x = nx
              portal.y = ny
              this.rebuildPortals()
              this.refreshSelectionOutline()
            }
          }
          return
        }
        if (this.panActive || (this.panEligible && overThreshold)) {
          if (this.panEligible && overThreshold) this.panActive = true
          this.applyCameraPan(dx, dy)
        }
        return
      }

      if (this.mode !== 'edit') return

      if (this.pendingPortalClickTarget) return

      const overThreshold = Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD

      if (this.dragItemId) {
        this.handleItemGroupDrag(pointer)
        return
      }

      if (this.panActive || (this.panEligible && overThreshold)) {
        if (this.panEligible && overThreshold) this.panActive = true
        this.applyCameraPan(dx, dy)
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.tryFinishPortalClick(pointer)

      if (this.mode === 'edit' && this.stamp?.kind === 'item' && this.pointerDownCell) {
        const moved =
          Math.abs(pointer.x - this.panStart.x) > PAN_THRESHOLD ||
          Math.abs(pointer.y - this.panStart.y) > PAN_THRESHOLD
        if (!moved && !this.panActive) {
          const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
          const hit = this.hitTestItem(cell.x, cell.y)
          if (!hit) {
            this.placeStampItem(cell.x, cell.y)
          }
        }
      }

      if (this.dragItemId) {
        this.emitLayoutChange('move')
        this.dragItemId = null
        this.dragGroupOrigins = null
      }
      if (this.dragPortalId) {
        const portal = this.findPortal(this.dragPortalId)
        const moved =
          portal &&
          this.portalDragOrigin &&
          (portal.x !== this.portalDragOrigin.x || portal.y !== this.portalDragOrigin.y)
        if (moved) this.emitLayoutChange('portal-move')
        this.dragPortalId = null
      }
      this.pendingPortalDragId = null
      this.portalDragOrigin = null
      this.finishPaintStroke()
      this.clearFillPreview()
      this.panActive = false
      this.panEligible = false
      this.pointerDownCell = null
    })

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.tryFinishPortalClick(pointer)
      this.finishPaintStroke()
      this.clearFillPreview()
    })

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as typeof this.wasd
      this.input.keyboard.on('keydown-D', () => {
        if (isTextInputFocused()) return
        if (this.mode === 'edit') this.deleteSelected()
      })
      this.input.keyboard.on('keydown-C', () => {
        if (isTextInputFocused()) return
        if (this.mode === 'edit') this.duplicateSelected()
      })
      this.input.keyboard.on('keydown-DELETE', () => {
        if (isTextInputFocused()) return
        if (this.mode === 'edit') this.deleteSelected()
      })
      this.input.keyboard.on('keydown-BACKSPACE', () => {
        if (isTextInputFocused()) return
        if (this.mode === 'edit') this.deleteSelected()
      })
      this.input.keyboard.on('keydown-R', () => {
        if (isTextInputFocused()) return
        if (this.mode === 'edit') this.rotateSelected()
      })
      this.input.keyboard.on('keydown-ESC', () => {
        if (isTextInputFocused()) return
        this.stamp = null
        this.clearItemSelection()
        this.selectedPortalId = null
        this.dragPortalId = null
        this.pendingPortalDragId = null
        this.portalDragOrigin = null
        this.fillDragging = false
        this.fillAnchorCell = null
        this.fillEndCell = null
        this.clearFillPreview()
        this.refreshSelectionOutline()
        this.emitSelection()
        this.emitPortalSelection()
        this.emitStampChange()
      })
      this.input.keyboard.on('keydown-SPACE', () => {
        if (isTextInputFocused()) return
        this.tryInteract()
      })
    }
  }

  private finishPaintStroke() {
    if (this.fillDragging) {
      this.finishFillStroke()
      return
    }
    if (this.paintDragging || this.paintIncremental) {
      this.rebuildBackground()
      this.rebuildWallCollision()
      this.emitLayoutChange('paint')
    }
    this.paintDragging = false
    this.paintIncremental = false
    this.lastPaintCell = null
  }

  private finishFillStroke() {
    if (!this.fillDragging || !this.fillAnchorCell || this.stamp?.kind !== 'tile') {
      this.fillDragging = false
      this.fillAnchorCell = null
      this.fillEndCell = null
      this.clearFillPreview()
      return
    }
    const end = this.fillEndCell ?? this.fillAnchorCell
    this.paintFillRect(
      this.fillAnchorCell.x,
      this.fillAnchorCell.y,
      end.x,
      end.y,
    )
    this.fillDragging = false
    this.fillAnchorCell = null
    this.fillEndCell = null
    this.clearFillPreview()
    this.emitLayoutChange('paint')
  }

  private paintFillRect(x0: number, y0: number, x1: number, y1: number) {
    if (this.stamp?.kind !== 'tile') return
    const { width, height } = this.layout.grid
    const minX = Math.max(0, Math.min(x0, x1))
    const minY = Math.max(0, Math.min(y0, y1))
    const maxX = Math.min(width - 1, Math.max(x0, x1))
    const maxY = Math.min(height - 1, Math.max(y0, y1))
    const rectW = maxX - minX + 1
    const rectH = maxY - minY + 1
    if (rectW <= 0 || rectH <= 0) return

    if (isGrassPaintTile(this.stamp)) {
      this.layout = fillRect(this.layout, minX, minY, rectW, rectH, {
        sheet: 'rpg',
        index: GRASS_PAINT_INDEX,
      })
    } else {
      this.layout = fillRect(this.layout, minX, minY, rectW, rectH, {
        sheet: this.stamp.sheet,
        index: this.stamp.index,
      })
    }
    this.rebuildBackground()
    this.rebuildWallCollision()
  }

  private drawFillPreview(x0: number, y0: number, x1: number, y1: number) {
    const cellPx = this.layout.grid.cellPx
    const minX = Math.min(x0, x1)
    const minY = Math.min(y0, y1)
    const maxX = Math.max(x0, x1)
    const maxY = Math.max(y0, y1)
    this.fillPreviewGraphics.clear()
    this.fillPreviewGraphics.lineStyle(2, SELECT_STROKE, 0.85)
    this.fillPreviewGraphics.fillStyle(SELECT_STROKE, 0.12)
    this.fillPreviewGraphics.fillRect(
      minX * cellPx,
      minY * cellPx,
      (maxX - minX + 1) * cellPx,
      (maxY - minY + 1) * cellPx,
    )
    this.fillPreviewGraphics.strokeRect(
      minX * cellPx + 1,
      minY * cellPx + 1,
      (maxX - minX + 1) * cellPx - 2,
      (maxY - minY + 1) * cellPx - 2,
    )
  }

  private clearFillPreview() {
    this.fillPreviewGraphics?.clear()
  }

  private isShiftDown(pointer: Phaser.Input.Pointer): boolean {
    return pointer.event instanceof MouseEvent && pointer.event.shiftKey
  }

  private handleEditItemPointerDown(
    cell: { x: number; y: number },
    pointer: Phaser.Input.Pointer,
  ): boolean {
    const hit = this.hitTestItem(cell.x, cell.y)
    if (!hit) return false

    this.selectedPortalId = null
    if (this.isShiftDown(pointer)) {
      this.toggleItemSelection(hit.id)
    } else if (!this.selectedIds.has(hit.id)) {
      this.setSingleItemSelection(hit.id)
    }

    if (!this.isLocked(hit.id) && this.selectedIds.has(hit.id)) {
      this.dragItemId = hit.id
      this.beginGroupDrag()
      const item = this.findItem(hit.id)
      if (item) {
        this.dragOffset = { x: cell.x - item.x, y: cell.y - item.y }
      }
    } else {
      this.dragItemId = null
      this.dragGroupOrigins = null
    }
    this.refreshSelectionOutline()
    this.emitSelection()
    this.emitPortalSelection()
    return true
  }

  private handleItemGroupDrag(pointer: Phaser.Input.Pointer) {
    const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
    const anchor = this.findItem(this.dragItemId!)
    if (!anchor || !this.dragGroupOrigins?.size) return
    const nx = cell.x - this.dragOffset.x
    const ny = cell.y - this.dragOffset.y
    const origin = this.dragGroupOrigins.get(this.dragItemId!)
    if (!origin) return
    const dx = nx - origin.x
    const dy = ny - origin.y
    if (dx === 0 && dy === 0) return

    let moved = false
    for (const id of this.selectedIds) {
      const item = this.findItem(id)
      const start = this.dragGroupOrigins.get(id)
      if (!item || !start || this.isLocked(id)) continue
      const trial = clampItemToBoundary(this.layout, {
        ...item,
        x: start.x + dx,
        y: start.y + dy,
      })
      if (item.x !== trial.x || item.y !== trial.y) moved = true
      item.x = trial.x
      item.y = trial.y
    }
    if (moved) this.rebuildItems()
  }

  private beginPortalSelect(portal: PortalDef, pointer: Phaser.Input.Pointer) {
    const cell = this.pointerToCell(pointer.worldX, pointer.worldY)
    this.clearItemSelection()
    this.selectedPortalId = portal.id
    this.pendingPortalDragId = portal.id
    this.portalDragOrigin = { x: portal.x, y: portal.y }
    this.dragPortalId = null
    this.dragPortalOffset = { x: cell.x - portal.x, y: cell.y - portal.y }
    this.refreshSelectionOutline()
    this.emitPortalSelection()
  }

  private paintCell(x: number, y: number, incremental = false) {
    if (this.stamp?.kind !== 'tile') return
    const { width, height } = this.layout.grid
    if (x < 0 || y < 0 || x >= width || y >= height) return
    if (this.lastPaintCell?.x === x && this.lastPaintCell?.y === y) return
    this.lastPaintCell = { x, y }

    const tile: { sheet: 'rpg' | 'indoor' | 'ui'; index: number } = isGrassPaintTile(this.stamp)
      ? { sheet: 'rpg', index: GRASS_PAINT_INDEX }
      : { sheet: this.stamp.sheet, index: this.stamp.index }

    this.layout.background.cells[cellKey(x, y)] = tile

    if (incremental) {
      this.paintIncremental = true
      this.refreshBackgroundCellAt(x, y)
    } else {
      this.rebuildBackground()
      this.rebuildWallCollision()
    }
  }

  private placeStampItem(cellX: number, cellY: number) {
    if (this.stamp?.kind !== 'item') return
    const assetId = this.stamp.assetId

    if (assetId === 'spawn_marker_groom') {
      this.layout.spawnGroom = { x: cellX, y: cellY }
      this.repositionPlayer()
      this.rebuildSpawnMarkers()
      this.emitLayoutChange('place')
      this.clearStampAfterPlace()
      return
    }
    if (assetId === 'spawn_marker_bride') {
      this.layout.spawnBride = { x: cellX, y: cellY }
      this.rebuildSpawnMarkers()
      this.emitLayoutChange('place')
      this.clearStampAfterPlace()
      return
    }

    if (assetId === 'easel_welcome') {
      const used = new Set(
        this.layout.items.filter((i) => i.assetId === 'easel_welcome').map((i) => i.easelSlot ?? 0),
      )
      let slot = 1
      while (used.has(slot) && slot <= 64) slot++
      if (slot > 64) return
      const item: PlacedItem = {
        id: crypto.randomUUID(),
        assetId,
        x: cellX,
        y: cellY,
        rotation: 0,
        easelSlot: slot,
      }
      this.layout.items.push(item)
      this.setSingleItemSelection(item.id)
      this.rebuildItems()
      this.emitLayoutChange('place')
      this.clearStampAfterPlace()
      return
    }

    const item: PlacedItem = {
      id: crypto.randomUUID(),
      assetId,
      x: cellX,
      y: cellY,
      rotation: 0,
    }
    if (!itemFitsInBoundary(this.layout, item)) return
    this.layout.items.push(item)
    this.setSingleItemSelection(item.id)
    this.rebuildItems()
    this.emitLayoutChange('place')
    this.clearStampAfterPlace()
  }

  private tryInteract() {
    if (this.mode !== 'walkthrough') return
    const px = this.player.x
    const py = this.player.y
    const cellPx = this.layout.grid.cellPx
    let best: PlacedItem | null = null
    let bestDist = 999
    for (const item of this.layout.items) {
      try {
        const cat = getCatalogItem(item.assetId)
        if (!cat.interactable) continue
      } catch {
        continue
      }
      const { w, h } = rotatedFootprint(
        getCatalogItem(item.assetId).widthCells,
        getCatalogItem(item.assetId).heightCells,
        item.rotation,
      )
      const ix = item.x * cellPx + (w * cellPx) / 2
      const iy = item.y * cellPx + (h * cellPx) / 2
      const d = Phaser.Math.Distance.Between(px, py, ix, iy)
      if (d < 48 && d < bestDist) {
        bestDist = d
        best = item
      }
    }
    if (!best) return
    const label = getCatalogItem(best.assetId).label_ko
    if (this.interactHint) this.interactHint.destroy()
    this.interactHint = this.add
      .text(this.cameras.main.centerX, 24, label, {
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(200)
    this.time.delayedCall(2500, () => {
      this.interactHint?.destroy()
      this.interactHint = null
    })
  }

  private bindBridge() {
    bindPhaserBridge({
      setLayout: (layout) => {
        this.layout = cloneLayout(layout)
        this.updateCameraBounds()
        const { width, height, cellPx } = this.layout.grid
        this.cameras.main.centerOn((width * cellPx) / 2, (height * cellPx) / 2)
        this.rebuildBackground()
        this.rebuildWallCollision()
        this.drawGrid()
        this.drawBoundary()
        this.rebuildItems()
        this.repositionPlayer()
        this.rebuildPortals()
        this.refreshSelectionOutline()
      },
      setMode: (mode) => {
        this.mode = mode
        if (mode === 'walkthrough') this.backgroundEdit = false
        this.applyModeVisuals()
      },
      setWalkRole: (role) => {
        this.walkRole = role
        this.updatePlayerSprite()
        this.repositionPlayer()
      },
      setBackgroundEdit: (on) => {
        const wasEditing = this.backgroundEdit
        this.backgroundEdit = on
        if (wasEditing && !on) {
          this.finishPaintStroke()
        }
        this.selectedPortalId = null
        this.dragPortalId = null
        this.pendingPortalDragId = null
        this.portalDragOrigin = null
        this.clearFillPreview()
        this.refreshSelectionOutline()
        this.emitPortalSelection()
        this.applyModeVisuals()
      },
      setStamp: (stamp) => {
        this.stamp = stamp
      },
      setContinuousPlacement: (on) => {
        this.continuousPlacement = on
      },
      getCanvas: () => this.game.canvas,
      getLayout: () => cloneLayout(this.layout),
      onLayoutChange: (listener) => {
        this.layoutListeners.add(listener)
        return () => this.layoutListeners.delete(listener)
      },
      onSelectionChange: (listener) => {
        this.selectionListeners.add(listener)
        return () => this.selectionListeners.delete(listener)
      },
      onStampChange: (listener) => {
        this.stampListeners.add(listener)
        return () => this.stampListeners.delete(listener)
      },
      onPortalEnter: (listener) => {
        this.portalListeners.add(listener)
        return () => this.portalListeners.delete(listener)
      },
      onPortalSelectionChange: (listener) => {
        this.portalSelectionListeners.add(listener)
        return () => this.portalSelectionListeners.delete(listener)
      },
      selectItem: (id) => {
        if (id) this.setSingleItemSelection(id)
        else this.clearItemSelection()
        this.refreshSelectionOutline()
        this.emitSelection()
      },
      clearSelection: () => {
        this.clearItemSelection()
        this.selectedPortalId = null
        this.dragPortalId = null
        this.pendingPortalDragId = null
        this.portalDragOrigin = null
        this.refreshSelectionOutline()
        this.emitSelection()
        this.emitPortalSelection()
      },
      deleteSelected: () => this.deleteSelected(),
      rotateSelected: () => this.rotateSelected(),
      duplicateSelected: () => this.duplicateSelected(),
      setZoom: (delta) => {
        const z = Phaser.Math.Clamp(this.cameras.main.zoom + delta, 0.5, 3)
        this.cameras.main.setZoom(z)
      },
    })
  }

  private emitSelection() {
    this.selectionListeners.forEach((l) => l([...this.selectedIds]))
  }

  private clearItemSelection() {
    this.selectedIds.clear()
    this.dragItemId = null
    this.dragGroupOrigins = null
  }

  private setSingleItemSelection(id: string) {
    this.selectedIds.clear()
    this.selectedIds.add(id)
  }

  private toggleItemSelection(id: string) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id)
    else this.selectedIds.add(id)
  }

  private beginGroupDrag() {
    this.dragGroupOrigins = new Map()
    for (const id of this.selectedIds) {
      const item = this.findItem(id)
      if (item && !this.isLocked(id)) {
        this.dragGroupOrigins.set(id, { x: item.x, y: item.y })
      }
    }
  }

  private updatePlayerSprite() {
    const role = this.walkRole
    if (this.bonelliPlayerReady) {
      const sheetKey = playerSheetKey(role)
      if (this.player.texture.key !== sheetKey) {
        this.player.setTexture(sheetKey, sheetFrameIndex(this.playerFacing, 'idle'))
      }
      playCharacterAnim(this.player, role, this.playerFacing, false)
      return
    }
    const idx = role === 'groom' ? KENNEY_GROOM_INDEX : KENNEY_BRIDE_INDEX
    const key = ensureTileTexture(this, 'rpg', idx)
    this.player.setTexture(key)
  }

  private applyModeVisuals() {
    const walk = this.mode === 'walkthrough'
    this.player.setVisible(walk)
    this.player.setAlpha(1)
    this.gridGraphics.setVisible(!walk)
    this.selectionGraphics.setVisible(!walk)
    this.portalLayer?.setVisible(!walk)
    this.portalLayer?.setDepth(this.backgroundEdit ? 2000 : 500)
    this.itemSprites.forEach((sprite) => {
      sprite.setInteractive(!walk)
    })
    if (walk) {
      this.clearItemSelection()
      this.refreshSelectionOutline()
      this.emitSelection()
      this.updatePlayerSprite()
      this.repositionPlayer()
      this.rebuildSpawnMarkers()
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    } else {
      this.cameras.main.stopFollow()
      this.rebuildSpawnMarkers()
    }
  }

  private repositionPlayer() {
    const spawn = this.walkRole === 'groom' ? this.layout.spawnGroom : this.layout.spawnBride
    const { grid } = this.layout
    const originY = this.bonelliPlayerReady ? 0.85 : 0.5
    this.player.setPosition(
      spawn.x * grid.cellPx + grid.cellPx / 2,
      spawn.y * grid.cellPx + grid.cellPx * originY,
    )
  }

  update() {
    if (!this.player.body) return
    if (this.mode !== 'walkthrough') {
      this.player.setVelocity(0)
      return
    }
    if (isTextInputFocused()) {
      this.player.setVelocity(0)
      return
    }

    const speed = 120
    this.player.setVelocity(0)
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const up = this.cursors.up.isDown || this.wasd.W.isDown
    const down = this.cursors.down.isDown || this.wasd.S.isDown
    if (left) this.player.setVelocityX(-speed)
    if (right) this.player.setVelocityX(speed)
    if (up) this.player.setVelocityY(-speed)
    if (down) this.player.setVelocityY(speed)

    if (this.bonelliPlayerReady) {
      const moving = left || right || up || down
      if (moving) {
        this.playerFacing = velocityToFacing(
          this.player.body.velocity.x,
          this.player.body.velocity.y,
          this.playerFacing,
        )
      }
      playCharacterAnim(this.player, this.walkRole, this.playerFacing, moving)
    }

    if (left || right || up || down) {
      this.checkPortalOverlap()
    }
  }

  private pointerToCell(worldX: number, worldY: number) {
    const cellPx = this.layout.grid.cellPx
    return {
      x: Math.floor(worldX / cellPx),
      y: Math.floor(worldY / cellPx),
    }
  }

  private isLocked(id: string): boolean {
    return this.layout.lockedItemIds?.includes(id) ?? false
  }

  private hitTestItem(cellX: number, cellY: number): PlacedItem | null {
    for (let i = this.layout.items.length - 1; i >= 0; i--) {
      const item = this.layout.items[i]
      if (item.assetId.startsWith('spawn_marker_')) continue
      if (itemOccupiesCell(item, cellX, cellY)) return item
    }
    return null
  }

  private findItem(id: string): PlacedItem | undefined {
    return this.layout.items.find((i) => i.id === id)
  }

  deleteSelected() {
    if (this.mode !== 'edit') return
    if (this.backgroundEdit && this.selectedPortalId) {
      this.deleteSelectedPortal()
    }
    if (this.selectedIds.size === 0) return

    const ids = [...this.selectedIds].filter((id) => !this.isLocked(id))
    if (ids.length === 0) return

    this.layout.items = this.layout.items.filter((item) => !ids.includes(item.id))
    this.clearItemSelection()
    this.rebuildItems()
    this.emitSelection()
    this.emitLayoutChange('delete')
  }

  rotateSelected() {
    if (this.mode !== 'edit' || this.selectedIds.size === 0) return

    let changed = false
    for (const id of this.selectedIds) {
      if (this.isLocked(id)) continue
      const item = this.findItem(id)
      if (!item) continue
      const cat = getCatalogItem(item.assetId)
      item.rotation = (item.rotation + cat.rotationStep) % 360
      changed = true
    }
    if (!changed) return
    this.rebuildItems()
    this.emitLayoutChange('rotate')
  }

  duplicateSelected() {
    if (this.mode !== 'edit' || this.selectedIds.size === 0) return

    const newIds: string[] = []
    const easelUsed = new Set(
      this.layout.items.filter((i) => i.assetId === 'easel_welcome').map((i) => i.easelSlot ?? 0),
    )

    for (const id of this.selectedIds) {
      const item = this.findItem(id)
      if (!item || item.assetId.startsWith('spawn_marker_') || this.isLocked(id)) continue

      const copy: PlacedItem = {
        ...structuredClone(item),
        id: crypto.randomUUID(),
        x: item.x + 2,
        y: item.y + 2,
      }

      if (copy.easelSlot) {
        let slot = 1
        while (easelUsed.has(slot) && slot <= 64) slot++
        if (slot > 64) continue
        copy.easelSlot = slot
        easelUsed.add(slot)
      }

      if (!itemFitsInBoundary(this.layout, copy)) continue
      this.layout.items.push(copy)
      newIds.push(copy.id)
    }

    if (newIds.length === 0) return
    this.selectedIds = new Set(newIds)
    this.rebuildItems()
    this.refreshSelectionOutline()
    this.emitSelection()
    this.emitLayoutChange('duplicate')
  }

  private refreshSelectionOutline() {
    this.selectionGraphics.clear()
    const cellPx = this.layout.grid.cellPx

    if (this.selectedPortalId) {
      const portal = this.findPortal(this.selectedPortalId)
      if (portal) {
        const w = portal.w ?? 1
        const h = portal.h ?? 1
        this.selectionGraphics.lineStyle(3, SELECT_STROKE, 1)
        this.selectionGraphics.strokeRect(
          portal.x * cellPx,
          portal.y * cellPx,
          w * cellPx,
          h * cellPx,
        )
      }
    }

    if (this.selectedIds.size === 0) return

    for (const id of this.selectedIds) {
      const item = this.findItem(id)
      if (!item) continue
      const cat = getCatalogItem(item.assetId)
      const { w, h } = rotatedFootprint(cat.widthCells, cat.heightCells, item.rotation)
      this.selectionGraphics.lineStyle(2, SELECT_STROKE, 1)
      this.selectionGraphics.strokeRect(item.x * cellPx, item.y * cellPx, w * cellPx, h * cellPx)
    }
  }

  private findPortal(id: string): PortalDef | undefined {
    return this.layout.portals?.find((p) => p.id === id)
  }

  private hitTestPortal(cellX: number, cellY: number): PortalDef | null {
    const portals = this.layout.portals
    if (!portals?.length) return null
    for (let i = portals.length - 1; i >= 0; i--) {
      const portal = portals[i]
      const w = portal.w ?? 1
      const h = portal.h ?? 1
      if (
        cellX >= portal.x &&
        cellX < portal.x + w &&
        cellY >= portal.y &&
        cellY < portal.y + h
      ) {
        return portal
      }
    }
    return null
  }

  private deleteSelectedPortal() {
    if (!this.selectedPortalId || !this.layout.portals) return
    const idx = this.layout.portals.findIndex((p) => p.id === this.selectedPortalId)
    if (idx >= 0) this.layout.portals.splice(idx, 1)
    this.selectedPortalId = null
    this.dragPortalId = null
    this.rebuildPortals()
    this.refreshSelectionOutline()
    this.emitPortalSelection()
    this.emitLayoutChange('portal-delete')
  }

  private emitPortalSelection() {
    this.portalSelectionListeners.forEach((l) => l(this.selectedPortalId))
  }

  private emitLayoutChange(reason: LayoutChangePayloadReason) {
    const payload = { layout: cloneLayout(this.layout), reason }
    this.layoutListeners.forEach((l) => l(payload))
  }
}

type LayoutChangePayloadReason =
  | 'place'
  | 'move'
  | 'delete'
  | 'rotate'
  | 'duplicate'
  | 'paint'
  | 'portal-move'
  | 'portal-delete'
  | 'external'