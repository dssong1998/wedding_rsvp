import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LeftSidebar } from './components/LeftSidebar'
import { PhaserCanvas } from './components/PhaserCanvas'
import { VersionLoadScreen } from './components/VersionLoadScreen'
import { VersionNameModal } from './components/VersionNameModal'
import { getCatalogItem, RECOMMENDED_TILES } from './config/catalog'
import { getVenuePreset, ensureVenuePortals } from './data/venues'
import { countChairs, countSeats } from './lib/footprint'
import {
  importLayoutFromFile,
  readLayoutFromLocation,
} from './lib/layoutCodec'
import { collectAllVenueLayouts } from './lib/campusBundle'
import { saveVenueDraft, loadVenueDraft, clearAllVenueDrafts } from './lib/layoutStorage'
import { isAppChord, matchesAppChord, matchesPlainKey } from './lib/keyboardShortcuts'
import { ko } from './locale/ko'
import { phaserBridge } from './phaser/bridge'
import {
  exportCanvasPng,
  exportLayoutJson,
  copyShareLink,
  resolveLayoutForExport,
} from './lib/share'
import {
  buildVersionUrl,
  fetchLayoutVersion,
  readHistoryIdFromLocation,
  readVersionFromLocation,
  saveLayoutVersion,
} from './lib/layoutApi'
import {
  clearUndo,
  popUndo,
  pushUndoSnapshot,
  shouldRecordUndo,
} from './lib/layoutHistory'
import { isTypingElement } from './lib/focusUtils'
import type {
  EditorMode,
  LayoutDocument,
  StampSelection,
  VenueId,
  WalkRole,
} from './types/layout'
import './App.css'

type Screen = 'load' | 'editor'

function shouldOpenEditorFromUrl(): boolean {
  return Boolean(readLayoutFromLocation(window.location.search) || readVersionFromLocation())
}

function resolveInitialLayout(): LayoutDocument {
  const fromUrl = readLayoutFromLocation(window.location.search)
  if (fromUrl) return ensureVenuePortals(fromUrl)

  if (readVersionFromLocation()) {
    return getVenuePreset('campus_map')
  }

  return getVenuePreset('campus_map')
}

function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    shouldOpenEditorFromUrl() ? 'editor' : 'load',
  )
  const [layout, setLayout] = useState<LayoutDocument>(() => resolveInitialLayout())
  const [activeVersionName, setActiveVersionName] = useState<string | null>(() =>
    readVersionFromLocation(),
  )
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(() =>
    readHistoryIdFromLocation(),
  )
  const [mode, setMode] = useState<EditorMode>('edit')
  const [walkRole, setWalkRole] = useState<WalkRole>('groom')
  const [backgroundEdit, setBackgroundEdit] = useState(false)
  const [continuousPlacement, setContinuousPlacement] = useState(false)
  const [stamp, setStamp] = useState<StampSelection>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds[selectedIds.length - 1] ?? null
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<string | null>(null)
  const [gameReady, setGameReady] = useState(false)
  const [versionLoadStatus, setVersionLoadStatus] = useState<string | null>(() => {
    return readVersionFromLocation() ? 'loading' : null
  })
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveTimer = useRef<number | null>(null)
  const layoutRef = useRef(layout)
  const isUndoing = useRef(false)
  const versionUrlLoadRef = useRef(0)
  layoutRef.current = layout

  const seatCount = useMemo(() => countSeats(layout.items), [layout.items])
  const chairCount = useMemo(() => countChairs(layout.items), [layout.items])

  const selectedPlaced = useMemo(() => {
    if (!selectedId) return null
    return layout.items.find((i) => i.id === selectedId) ?? null
  }, [selectedId, layout.items])

  const selectedItem = useMemo(() => {
    const id =
      selectedId ??
      (stamp?.kind === 'item' ? stamp.assetId : null)
    if (!id) return null
    if (selectedId) {
      const item = layout.items.find((i) => i.id === selectedId)
      if (item) {
        try {
          return getCatalogItem(item.assetId)
        } catch {
          return null
        }
      }
    }
    if (stamp?.kind === 'item') {
      try {
        return getCatalogItem(stamp.assetId)
      } catch {
        return null
      }
    }
    return null
  }, [selectedId, layout.items, stamp])

  const scheduleDraftSave = useCallback((doc: LayoutDocument) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveVenueDraft(doc.venueId, doc)
      setDraftStatus(ko.draftSaved)
    }, 1000)
  }, [])

  const onBackgroundEditChange = useCallback((on: boolean) => {
    setBackgroundEdit(on)
    if (on) setStamp(null)
  }, [])

  const applyLayout = useCallback(
    (next: LayoutDocument) => {
      const doc = ensureVenuePortals(next)
      clearUndo(doc.venueId)
      setLayout(doc)
      if (gameReady) {
        phaserBridge.setLayout(doc)
        phaserBridge.setStamp(null)
      }
      setStamp(null)
      setSelectedIds([])
      setSelectedPortalId(null)
      scheduleDraftSave(doc)
    },
    [gameReady, scheduleDraftSave],
  )

  const switchVenue = useCallback(
    (targetVenueId: VenueId) => {
      const current = layoutRef.current
      if (current.venueId === targetVenueId) return

      saveVenueDraft(current.venueId, current)
      const loaded = loadVenueDraft(targetVenueId) ?? getVenuePreset(targetVenueId)
      applyLayout(loaded)
    },
    [applyLayout],
  )

  useEffect(() => {
    const versionName = readVersionFromLocation()
    if (!versionName) return

    let cancelled = false
    const loadId = ++versionUrlLoadRef.current
    setVersionLoadStatus('loading')
    setScreen('editor')

    const historyId = readHistoryIdFromLocation() ?? undefined
    fetchLayoutVersion(versionName, { historyId })
      .then((doc) => {
        if (cancelled || loadId !== versionUrlLoadRef.current) return
        applyLayout(doc)
        setActiveVersionName(versionName)
        if (historyId !== undefined) setActiveHistoryId(historyId)
        setVersionLoadStatus(null)
      })
      .catch((err: unknown) => {
        if (cancelled || loadId !== versionUrlLoadRef.current) return
        setScreen('load')
        const message =
          err instanceof Error
            ? err.message
            : ko.versionNotFound.replace('{name}', versionName)
        setShareStatus(message)
        setVersionLoadStatus(null)
        window.history.replaceState({}, '', '/')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial URL load only
  }, [])

  useEffect(() => {
    if (!gameReady) return
    // Phaser가 이미 편집 중인 layout을 갖고 있음 — 매 변경마다 setLayout 하면 카메라가 리셋됨
    phaserBridge.setLayout(layoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameReady 시 1회 동기화
  }, [gameReady])

  useEffect(() => {
    if (!gameReady) return
    phaserBridge.setMode(mode)
    if (mode === 'walkthrough') setBackgroundEdit(false)
  }, [mode, gameReady])

  useEffect(() => {
    if (!gameReady) return
    phaserBridge.setWalkRole(walkRole)
  }, [walkRole, gameReady])

  useEffect(() => {
    if (!gameReady) return
    phaserBridge.setBackgroundEdit(backgroundEdit)
  }, [backgroundEdit, gameReady])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingElement(e.target)) return

      if (mode === 'edit') {
        if (matchesPlainKey(e, 'c', { requireNoModifiers: true })) {
          e.preventDefault()
          if (gameReady) phaserBridge.duplicateSelected()
          return
        }
        if (matchesPlainKey(e, 'd', { requireNoModifiers: true })) {
          e.preventDefault()
          if (gameReady) phaserBridge.deleteSelected()
          return
        }
        if (matchesPlainKey(e, 'r', { requireNoModifiers: true })) {
          e.preventDefault()
          if (gameReady) phaserBridge.rotateSelected()
          return
        }
        if (
          matchesPlainKey(e, '[', { requireNoModifiers: true }) ||
          matchesPlainKey(e, '=', { requireNoModifiers: true })
        ) {
          e.preventDefault()
          if (gameReady) phaserBridge.setZoom(0.15)
          return
        }
        if (
          matchesPlainKey(e, ']', { requireNoModifiers: true }) ||
          matchesPlainKey(e, '-', { requireNoModifiers: true })
        ) {
          e.preventDefault()
          if (gameReady) phaserBridge.setZoom(-0.15)
          return
        }
      }

      if (!isAppChord(e)) return
      if (mode !== 'edit') return

      if (matchesAppChord(e, 'z')) {
        e.preventDefault()
        if (!gameReady) return
        const venueId = layoutRef.current.venueId
        const prev = popUndo(venueId)
        if (!prev) return
        isUndoing.current = true
        phaserBridge.setLayout(prev)
        phaserBridge.clearSelection()
        setLayout(prev)
        setSelectedIds([])
        setSelectedPortalId(null)
        scheduleDraftSave(prev)
        isUndoing.current = false
        return
      }

      if (matchesAppChord(e, 'b')) {
        e.preventDefault()
        onBackgroundEditChange(!backgroundEdit)
        return
      }

      if (!backgroundEdit) return
      const n = Number(e.key)
      if (n >= 1 && n <= 5) {
        e.preventDefault()
        const tile = RECOMMENDED_TILES[n - 1]
        if (tile) setStamp({ kind: 'tile', sheet: tile.sheet, index: tile.index })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, backgroundEdit, scheduleDraftSave, gameReady, onBackgroundEditChange])

  useEffect(() => {
    if (!gameReady) return
    phaserBridge.setStamp(stamp)
  }, [stamp, gameReady])

  useEffect(() => {
    if (!gameReady) return
    phaserBridge.setContinuousPlacement(continuousPlacement)
  }, [continuousPlacement, gameReady])

  useEffect(() => {
    if (!gameReady) return
    return phaserBridge.onLayoutChange(({ layout: next, reason }) => {
      if (!isUndoing.current && shouldRecordUndo(reason)) {
        pushUndoSnapshot(layoutRef.current)
      }
      setLayout(next)
      scheduleDraftSave(next)
    })
  }, [gameReady, scheduleDraftSave])

  useEffect(() => {
    if (!gameReady) return
    return phaserBridge.onSelectionChange((ids) => setSelectedIds(ids))
  }, [gameReady])

  useEffect(() => {
    if (!gameReady) return
    return phaserBridge.onPortalSelectionChange((id) => setSelectedPortalId(id))
  }, [gameReady])

  useEffect(() => {
    if (!gameReady) return
    return phaserBridge.onStampChange((next) => setStamp(next))
  }, [gameReady])

  useEffect(() => {
    if (!gameReady) return
    return phaserBridge.onPortalEnter((targetVenueId) => switchVenue(targetVenueId))
  }, [gameReady, switchVenue])

  const currentLayout = useCallback(
    () => resolveLayoutForExport(layoutRef.current, phaserBridge.getLayout()),
    [],
  )

  const onShare = useCallback(async () => {
    try {
      const doc = currentLayout()
      const url = await copyShareLink(doc)
      setShareStatus(ko.shareCopied)
      window.history.replaceState({}, '', url)
    } catch {
      setShareStatus(ko.shareFailed)
    }
  }, [currentLayout])

  const onShareVersionLink = useCallback(async () => {
    try {
      if (activeVersionName) {
        const url = buildVersionUrl(activeVersionName, {
          historyId: activeHistoryId ?? undefined,
        })
        await navigator.clipboard.writeText(url)
        window.history.replaceState({}, '', url)
        setShareStatus(ko.versionUrlCopied)
        return
      }
      await onShare()
    } catch {
      setShareStatus(ko.versionUrlCopyFailed)
    }
  }, [activeVersionName, activeHistoryId, onShare])

  const onExportJson = useCallback(() => {
    exportLayoutJson(currentLayout())
  }, [currentLayout])

  const onExportPng = useCallback(() => {
    const canvas = phaserBridge.getCanvas()
    if (canvas) exportCanvasPng(canvas, currentLayout())
  }, [currentLayout])

  const onImport = useCallback(async (file: File) => {
    try {
      const imported = await importLayoutFromFile(file)
      applyLayout(imported)
      setActiveVersionName(null)
      setActiveHistoryId(null)
    } catch {
      setShareStatus(ko.importFailed)
    }
  }, [applyLayout])

  const openEditorWithVersion = useCallback(
    async (versionName: string, historyId?: number) => {
      setVersionLoadStatus('loading')
      setShareStatus(null)
      try {
        const doc = await fetchLayoutVersion(versionName, { historyId })
        applyLayout(doc)
        setActiveVersionName(versionName)
        setActiveHistoryId(historyId ?? null)
        const url = buildVersionUrl(versionName, { historyId })
        window.history.replaceState({}, '', url)
        setScreen('editor')
        setVersionLoadStatus(null)
        setShareStatus(ko.versionHistoryLoaded)
      } catch (err: unknown) {
        setVersionLoadStatus(null)
        setShareStatus(err instanceof Error ? err.message : ko.versionHistoryLoadFailed)
      }
    },
    [applyLayout],
  )

  const createNewVersion = useCallback(
    (versionName: string) => {
      versionUrlLoadRef.current += 1
      clearAllVenueDrafts()
      const doc = getVenuePreset('campus_map')
      doc.name = versionName
      applyLayout(doc)
      setActiveVersionName(versionName)
      setActiveHistoryId(null)
      window.history.replaceState({}, '', '/')
      setScreen('editor')
      setShareStatus(null)
      setVersionLoadStatus(null)
    },
    [applyLayout],
  )

  const onConfirmSave = useCallback(
    async (versionName: string) => {
      setSaving(true)
      try {
        const doc = currentLayout()
        const bundle = collectAllVenueLayouts(doc)
        const history = await saveLayoutVersion(versionName, bundle, { label: doc.name })
        setActiveVersionName(versionName)
        setActiveHistoryId(history.id)
        const url = buildVersionUrl(versionName, { historyId: history.id })
        window.history.replaceState({}, '', url)
        setShareStatus(ko.versionSaved.replace('{name}', versionName))
        setSaveModalOpen(false)
      } catch (err: unknown) {
        setShareStatus(err instanceof Error ? err.message : ko.versionSaveFailed)
      } finally {
        setSaving(false)
      }
    },
    [currentLayout],
  )

  if (screen === 'load') {
    return (
      <VersionLoadScreen
        onLoad={(name, historyId) => void openEditorWithVersion(name, historyId)}
        onCreateNew={createNewVersion}
        statusMessage={shareStatus}
      />
    )
  }

  if (versionLoadStatus === 'loading') {
    return (
      <div className="draft-overlay">
        <div className="draft-card">
          <h2>{ko.loading}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <LeftSidebar
        layout={layout}
        mode={mode}
        walkRole={walkRole}
        backgroundEdit={backgroundEdit}
        continuousPlacement={continuousPlacement}
        stamp={stamp}
        seatCount={seatCount}
        chairCount={chairCount}
        shareStatus={shareStatus ?? versionLoadStatus}
        draftStatus={draftStatus}
        activeVersionName={activeVersionName}
        onSave={() => setSaveModalOpen(true)}
        onLoad={() => {
          window.history.replaceState({}, '', '/')
          setScreen('load')
        }}
        onShareVersionLink={() => void onShareVersionLink()}
        onModeChange={setMode}
        onWalkRoleChange={setWalkRole}
        onBackgroundEditChange={onBackgroundEditChange}
        onContinuousPlacementChange={setContinuousPlacement}
        onStampChange={setStamp}
        onShare={() => void onShare()}
        onExportJson={onExportJson}
        onImport={onImport}
        onExportPng={onExportPng}
        onSaveLocal={() => {
          const doc = currentLayout()
          saveVenueDraft(doc.venueId, doc)
          setLayout(doc)
          setDraftStatus(ko.draftSaved)
        }}
        onDelete={() => phaserBridge.deleteSelected()}
        onRotate={() => phaserBridge.rotateSelected()}
        onDuplicate={() => phaserBridge.duplicateSelected()}
        onZoom={(d) => phaserBridge.setZoom(d)}
        selectedItem={selectedItem}
        selectedPlaced={selectedPlaced}
        selectedCount={selectedIds.length}
        selectedPortalId={selectedPortalId}
      />
      <main className="canvas-wrap">
        <PhaserCanvas
          initialLayout={layout}
          onReady={() => setGameReady(true)}
          onDestroy={() => setGameReady(false)}
        />
      </main>

      <VersionNameModal
        open={saveModalOpen}
        title={ko.saveModalTitle}
        confirmLabel={saving ? ko.versionSaving : ko.save}
        initialName={activeVersionName ?? ''}
        onConfirm={(name) => void onConfirmSave(name)}
        onCancel={() => setSaveModalOpen(false)}
      />
    </div>
  )
}

export default App
