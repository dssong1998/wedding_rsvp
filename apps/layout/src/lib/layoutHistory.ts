import type { LayoutDocument, VenueId } from '../types/layout'
import type { LayoutChangePayload } from '../phaser/bridge'

const MAX_UNDO = 50

const stacks = new Map<VenueId, LayoutDocument[]>()

const UNDOABLE: Set<LayoutChangePayload['reason']> = new Set([
  'place',
  'move',
  'delete',
  'rotate',
  'duplicate',
  'paint',
  'portal-move',
  'portal-delete',
])

export function pushUndoSnapshot(before: LayoutDocument): void {
  const stack = stacks.get(before.venueId) ?? []
  stack.push(structuredClone(before))
  if (stack.length > MAX_UNDO) stack.shift()
  stacks.set(before.venueId, stack)
}

export function shouldRecordUndo(reason: LayoutChangePayload['reason']): boolean {
  return UNDOABLE.has(reason)
}

export function popUndo(venueId: VenueId): LayoutDocument | null {
  const stack = stacks.get(venueId)
  if (!stack?.length) return null
  return stack.pop() ?? null
}

export function clearUndo(venueId: VenueId): void {
  stacks.set(venueId, [])
}
