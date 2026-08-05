import { useMemo, useRef, useState } from 'react'
import { RECOMMENDED_TILES, listPlacedCatalogItems, type CatalogItem } from '../config/catalog'
import { filterBaseTiles } from '../lib/baseTileCatalog'
import { listSheetOptions } from '../lib/tileLabels'
import type { KenneySheetId } from '../config/kenneySheets'
import { chordLabel, chordNumberLabel, formatShortcutHints } from '../lib/keyboardShortcuts'
import { ko } from '../locale/ko'
import { validateVenueLayout } from '../lib/venueValidation'
import type {
  EditorMode,
  LayoutDocument,
  PortalDef,
  StampSelection,
  WalkRole,
  PlacedItem,
} from '../types/layout'
import { ItemReferencePanel } from './ItemReferencePanel'

type Props = {
  layout: LayoutDocument
  mode: EditorMode
  walkRole: WalkRole
  backgroundEdit: boolean
  continuousPlacement: boolean
  stamp: StampSelection
  seatCount: number
  chairCount: number
  shareStatus: string | null
  draftStatus: string | null
  activeVersionName: string | null
  onSave: () => void
  onLoad: () => void
  onShareVersionLink: () => void
  onModeChange: (m: EditorMode) => void
  onWalkRoleChange: (r: WalkRole) => void
  onBackgroundEditChange: (on: boolean) => void
  onContinuousPlacementChange: (on: boolean) => void
  onStampChange: (s: StampSelection) => void
  onShare: () => void
  onExportJson: () => void
  onImport: (file: File) => void
  onExportPng: () => void
  onSaveLocal: () => void
  onDelete: () => void
  onRotate: () => void
  onDuplicate: () => void
  onZoom: (delta: number) => void
  selectedItem: CatalogItem | null
  selectedPlaced: PlacedItem | null
  selectedCount: number
  selectedPortalId: string | null
}

export function LeftSidebar(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tileSheet, setTileSheet] = useState<KenneySheetId | ''>('')
  const [tileQuery, setTileQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const catalogItems = useMemo(() => listPlacedCatalogItems(), [])
  const baseTiles = useMemo(
    () => filterBaseTiles(tileSheet || undefined, tileQuery).slice(0, 120),
    [tileSheet, tileQuery],
  )
  const venueChecks = useMemo(() => validateVenueLayout(props.layout), [props.layout])
  const selectedPortal = useMemo((): PortalDef | null => {
    if (!props.selectedPortalId) return null
    return props.layout.portals?.find((p) => p.id === props.selectedPortalId) ?? null
  }, [props.selectedPortalId, props.layout.portals])

  const toggleItemStamp = (assetId: string) => {
    const next: StampSelection =
      props.stamp?.kind === 'item' && props.stamp.assetId === assetId
        ? null
        : { kind: 'item', assetId }
    props.onStampChange(next)
  }

  const toggleTileStamp = (sheet: KenneySheetId, index: number) => {
    const next: StampSelection =
      props.stamp?.kind === 'tile' && props.stamp.sheet === sheet && props.stamp.index === index
        ? null
        : { kind: 'tile', sheet, index }
    props.onStampChange(next)
  }

  return (
    <aside className="left-sidebar">
      <header className="sidebar-brand">
        <h1>{ko.appTitle}</h1>
      </header>

      <section className="sidebar-section version-actions">
        <div className="btn-row">
          <button type="button" className="primary" onClick={props.onSave}>
            {ko.save}
          </button>
          <button type="button" onClick={props.onLoad}>
            {ko.load}
          </button>
        </div>
        <button type="button" className="btn-block" onClick={props.onShareVersionLink}>
          {ko.shareVersionLink}
        </button>
        {props.activeVersionName && (
          <p className="hint">
            {ko.activeVersion}: {props.activeVersionName}
          </p>
        )}
        <button
          type="button"
          className="btn-block settings-toggle"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          {ko.settings} {settingsOpen ? '▾' : '▸'}
        </button>
        {settingsOpen && (
          <div className="settings-panel">
            <button type="button" className="btn-block" onClick={props.onShare}>
              {ko.fileShare}
            </button>
            <button type="button" className="btn-block" onClick={props.onExportJson}>
              {ko.fileExportJson}
            </button>
            <button type="button" className="btn-block" onClick={() => fileRef.current?.click()}>
              {ko.fileImportJson}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) props.onImport(f)
                e.target.value = ''
              }}
            />
            <button type="button" className="btn-block" onClick={props.onExportPng}>
              {ko.fileExportPng}
            </button>
            <button type="button" className="btn-block" onClick={props.onSaveLocal}>
              {ko.fileSaveLocal}
            </button>
          </div>
        )}
        {props.shareStatus && <p className="status">{props.shareStatus}</p>}
        {props.draftStatus && <p className="status">{props.draftStatus}</p>}
      </section>

      <section className="sidebar-section">
        <label>{ko.venue}</label>
        <div className="venue-label">{ko.venues[props.layout.venueId]}</div>
        {(props.layout.portals?.length ?? 0) > 0 && (
          <p className="hint">{ko.portalHint}</p>
        )}
      </section>

      <section className="sidebar-section">
        <div className="mode-row">
          <button
            type="button"
            className={props.mode === 'edit' ? 'active' : ''}
            onClick={() => props.onModeChange('edit')}
          >
            {ko.modeEdit}
          </button>
          <button
            type="button"
            className={props.mode === 'walkthrough' ? 'active' : ''}
            onClick={() => props.onModeChange('walkthrough')}
          >
            {ko.modeWalkthrough}
          </button>
        </div>
        {props.mode === 'edit' && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.backgroundEdit}
              onChange={(e) => props.onBackgroundEditChange(e.target.checked)}
            />
            {ko.backgroundEdit} ({chordLabel('B')})
          </label>
        )}
        {props.mode === 'edit' && !props.backgroundEdit && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.continuousPlacement}
              onChange={(e) => props.onContinuousPlacementChange(e.target.checked)}
            />
            {ko.continuousPlacement}
          </label>
        )}
        {props.mode === 'edit' && !props.backgroundEdit && (
          <p className="hint">{ko.portalHint}</p>
        )}
        {props.mode === 'edit' && props.backgroundEdit && (
          <>
            <p className="hint">{ko.backgroundEditHint}</p>
            <p className="hint">{ko.backgroundPortalHint}</p>
          </>
        )}
        {props.mode === 'walkthrough' && (
          <div className="mode-row">
            <button
              type="button"
              className={props.walkRole === 'groom' ? 'active' : ''}
              onClick={() => props.onWalkRoleChange('groom')}
            >
              {ko.walkRoleGroom}
            </button>
            <button
              type="button"
              className={props.walkRole === 'bride' ? 'active' : ''}
              onClick={() => props.onWalkRoleChange('bride')}
            >
              {ko.walkRoleBride}
            </button>
          </div>
        )}
        {props.mode === 'walkthrough' && <p className="hint">{ko.walkControls}</p>}
      </section>

      <section className="sidebar-section palette-section">
        <h2>{props.backgroundEdit ? ko.paletteTiles : ko.paletteItems}</h2>
        {props.mode === 'edit' &&
          !props.backgroundEdit &&
          catalogItems.map((item) => (
            <button
              key={item.assetId}
              type="button"
              className={`palette-btn ${
                props.stamp?.kind === 'item' && props.stamp.assetId === item.assetId ? 'active' : ''
              }`}
              onClick={() => toggleItemStamp(item.assetId)}
            >
              {item.label_ko}
            </button>
          ))}
        {props.backgroundEdit && (
          <>
            <h3>{ko.paletteRecommended}</h3>
            <div className="palette-grid">
              {RECOMMENDED_TILES.map((t, i) => (
                <button
                  key={`${t.sheet}-${t.index}`}
                  type="button"
                  className={`palette-btn small ${
                    props.stamp?.kind === 'tile' &&
                    props.stamp.sheet === t.sheet &&
                    props.stamp.index === t.index
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => toggleTileStamp(t.sheet, t.index)}
                  title={t.label_ko}
                >
                  {i < 5 && <span className="shortcut-badge">{chordNumberLabel(i + 1)}</span>}
                  {t.label_ko}
                </button>
              ))}
            </div>
            <label>{ko.tileSheetFilter}</label>
            <select
              value={tileSheet}
              onChange={(e) => setTileSheet(e.target.value as KenneySheetId | '')}
            >
              <option value="">전체</option>
              {listSheetOptions().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label_ko}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="이름 또는 #번호"
              value={tileQuery}
              onChange={(e) => setTileQuery(e.target.value)}
            />
            <div className="tile-scroll">
              {baseTiles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tile-btn ${
                    props.stamp?.kind === 'tile' &&
                    props.stamp.sheet === t.sheet &&
                    props.stamp.index === t.index
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => toggleTileStamp(t.sheet, t.index)}
                  title={`${t.sheet}:${t.index}`}
                >
                  {t.label_ko}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="hint">{ko.escClearStamp}</p>
        <p className="hint">{formatShortcutHints()}</p>
      </section>

      {!props.backgroundEdit && <ItemReferencePanel item={props.selectedItem} />}
      {props.backgroundEdit && selectedPortal && (
        <section className="sidebar-section inspector">
          <h2>{ko.portalSelection}</h2>
          <div>{selectedPortal.label_ko ?? selectedPortal.targetVenueId}</div>
          <div>
            {ko.coords}: ({selectedPortal.x}, {selectedPortal.y}) · {selectedPortal.w ?? 1}×
            {selectedPortal.h ?? 1}
          </div>
          <div className="btn-row">
            <button type="button" onClick={props.onDelete}>
              {ko.delete}
            </button>
          </div>
        </section>
      )}
      {!props.backgroundEdit && props.selectedPlaced && (
        <section className="sidebar-section inspector">
          {props.selectedCount > 1 && (
            <div className="hint">{props.selectedCount}개 선택됨</div>
          )}
          <div>
            {ko.coords}: ({props.selectedPlaced.x}, {props.selectedPlaced.y}) ·{' '}
            {props.selectedPlaced.rotation}°
          </div>
          {props.selectedPlaced.easelSlot != null && (
            <div>
              {ko.easelSlot}: {props.selectedPlaced.easelSlot}
            </div>
          )}
          {props.layout.lockedItemIds?.includes(props.selectedPlaced.id) && (
            <div className="hint">{ko.locked}</div>
          )}
        </section>
      )}

      {!props.backgroundEdit && (
        <section className="sidebar-section">
          <h2>{ko.selection}</h2>
          <div className="btn-row">
            <button type="button" onClick={props.onRotate}>
              ↻ {ko.rotate}
            </button>
            <button type="button" onClick={props.onDuplicate}>
              {ko.duplicate}
            </button>
            <button type="button" onClick={props.onDelete}>
              {ko.delete}
            </button>
          </div>
          <div className="btn-row">
            <button type="button" onClick={() => props.onZoom(0.15)}>
              {ko.zoomIn} ([)
            </button>
            <button type="button" onClick={() => props.onZoom(-0.15)}>
              {ko.zoomOut} (])
            </button>
          </div>
        </section>
      )}
      {props.backgroundEdit && (
        <section className="sidebar-section">
          <div className="btn-row">
            <button type="button" onClick={() => props.onZoom(0.15)}>
              {ko.zoomIn} ([)
            </button>
            <button type="button" onClick={() => props.onZoom(-0.15)}>
              {ko.zoomOut} (])
            </button>
          </div>
        </section>
      )}

      <section className="sidebar-section stats">
        <div>
          {ko.statsSeats}: {props.seatCount}
        </div>
        <div>
          {ko.statsChairs}: {props.chairCount}
        </div>
        <h3>{ko.statsChecks}</h3>
        <ul className="check-list">
          {venueChecks.map((c) => (
            <li key={c.label_ko} className={c.ok ? 'ok' : 'warn'}>
              {c.label_ko}: {c.detail}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
