import type {
  EditorMode,
  LayoutDocument,
  PlacedItem,
  StampSelection,
  VenueId,
  WalkRole,
} from '../types/layout'

export type LayoutChangePayload = {
  layout: LayoutDocument
  reason:
    | 'place'
    | 'move'
    | 'delete'
    | 'rotate'
    | 'duplicate'
    | 'paint'
    | 'portal-move'
    | 'portal-delete'
    | 'external'
}

type LayoutChangeListener = (payload: LayoutChangePayload) => void

export type PhaserBridge = {
  setLayout: (layout: LayoutDocument) => void
  setMode: (mode: EditorMode) => void
  setWalkRole: (role: WalkRole) => void
  setBackgroundEdit: (on: boolean) => void
  setStamp: (stamp: StampSelection) => void
  setContinuousPlacement: (on: boolean) => void
  getCanvas: () => HTMLCanvasElement | null
  /** Latest layout from the editor (includes unpersisted background paints). */
  getLayout: () => LayoutDocument | null
  onLayoutChange: (listener: LayoutChangeListener) => () => void
  onSelectionChange: (listener: (ids: string[]) => void) => () => void
  onStampChange: (listener: (stamp: StampSelection) => void) => () => void
  onPortalEnter: (listener: (targetVenueId: VenueId) => void) => () => void
  onPortalSelectionChange: (listener: (id: string | null) => void) => () => void
  selectItem: (id: string | null) => void
  clearSelection: () => void
  deleteSelected: () => void
  rotateSelected: () => void
  duplicateSelected: () => void
  setZoom: (delta: number) => void
}

function createEventHook<T extends (...args: never[]) => void>() {
  const pending = new Set<T>()
  let attach: ((listener: T) => () => void) | null = null

  return {
    subscribe(listener: T): () => void {
      if (attach) return attach(listener)
      pending.add(listener)
      return () => pending.delete(listener)
    },
    bind(attachFn: (listener: T) => () => void) {
      attach = attachFn
      for (const listener of pending) attachFn(listener)
      pending.clear()
    },
  }
}

const layoutChangeHook = createEventHook<LayoutChangeListener>()
const selectionChangeHook = createEventHook<(ids: string[]) => void>()
const stampChangeHook = createEventHook<(stamp: StampSelection) => void>()
const portalEnterHook = createEventHook<(targetVenueId: VenueId) => void>()
const portalSelectionChangeHook = createEventHook<(id: string | null) => void>()

export const phaserBridge: PhaserBridge = {
  setLayout: () => {},
  setMode: () => {},
  setWalkRole: () => {},
  setBackgroundEdit: () => {},
  setStamp: () => {},
  setContinuousPlacement: () => {},
  getCanvas: () => null,
  getLayout: () => null,
  onLayoutChange: (listener) => layoutChangeHook.subscribe(listener),
  onSelectionChange: (listener) => selectionChangeHook.subscribe(listener),
  onStampChange: (listener) => stampChangeHook.subscribe(listener),
  onPortalEnter: (listener) => portalEnterHook.subscribe(listener),
  onPortalSelectionChange: (listener) => portalSelectionChangeHook.subscribe(listener),
  selectItem: () => {},
  clearSelection: () => {},
  deleteSelected: () => {},
  rotateSelected: () => {},
  duplicateSelected: () => {},
  setZoom: () => {},
}

export function bindPhaserBridge(impl: Partial<PhaserBridge>): void {
  if (impl.onLayoutChange) layoutChangeHook.bind(impl.onLayoutChange)
  if (impl.onSelectionChange) selectionChangeHook.bind(impl.onSelectionChange)
  if (impl.onStampChange) stampChangeHook.bind(impl.onStampChange)
  if (impl.onPortalEnter) portalEnterHook.bind(impl.onPortalEnter)
  if (impl.onPortalSelectionChange) portalSelectionChangeHook.bind(impl.onPortalSelectionChange)

  Object.assign(phaserBridge, impl)

  phaserBridge.onLayoutChange = (listener) => layoutChangeHook.subscribe(listener)
  phaserBridge.onSelectionChange = (listener) => selectionChangeHook.subscribe(listener)
  phaserBridge.onStampChange = (listener) => stampChangeHook.subscribe(listener)
  phaserBridge.onPortalEnter = (listener) => portalEnterHook.subscribe(listener)
  phaserBridge.onPortalSelectionChange = (listener) =>
    portalSelectionChangeHook.subscribe(listener)
}

export function cloneLayout(layout: LayoutDocument): LayoutDocument {
  return structuredClone(layout)
}

export function findItem(layout: LayoutDocument, id: string): PlacedItem | undefined {
  return layout.items.find((i) => i.id === id)
}
