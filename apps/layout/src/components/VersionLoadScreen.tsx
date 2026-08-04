import { useCallback, useEffect, useState } from 'react'
import { ko } from '../locale/ko'
import {
  fetchLayoutStorageStatus,
  formatHistoryLabel,
  listLayoutVersions,
  listVersionHistory,
  type LayoutStorageStatus,
  type LayoutVersionHistoryMeta,
  type LayoutVersionMeta,
} from '../lib/layoutApi'
import { VersionNameModal } from './VersionNameModal'

type Props = {
  onLoad: (versionName: string, historyId?: number) => void
  onCreateNew: (versionName: string) => void
  statusMessage?: string | null
}

export function VersionLoadScreen({ onLoad, onCreateNew, statusMessage }: Props) {
  const [storage, setStorage] = useState<LayoutStorageStatus | null>(null)
  const [versions, setVersions] = useState<LayoutVersionMeta[]>([])
  const [historyMap, setHistoryMap] = useState<Record<string, LayoutVersionHistoryMeta[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [status, items] = await Promise.all([
        fetchLayoutStorageStatus(),
        listLayoutVersions(),
      ])
      setStorage(status)
      setVersions(items)
    } catch {
      setError(ko.versionListFailed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleExpand = async (name: string) => {
    if (expanded === name) {
      setExpanded(null)
      return
    }
    setExpanded(name)
    if (historyMap[name]) return
    try {
      const items = await listVersionHistory(name)
      setHistoryMap((prev) => ({ ...prev, [name]: items }))
    } catch {
      setHistoryMap((prev) => ({ ...prev, [name]: [] }))
    }
  }

  return (
    <div className="load-screen">
      <div className="load-card">
        <header className="load-header">
          <h1>{ko.loadScreenTitle}</h1>
          <p className="hint">
            {storage?.configured
              ? ko.loadScreenHintConfigured
              : ko.loadScreenHintNotConfigured}
          </p>
        </header>

        <button type="button" className="btn-block primary" onClick={() => setCreateModalOpen(true)}>
          {ko.createNewVersion}
        </button>

        {loading && <p className="hint">{ko.loading}</p>}
        {error && <p className="modal-error">{error}</p>}
        {statusMessage && <p className="modal-error">{statusMessage}</p>}

        {!loading && versions.length === 0 && (
          <p className="hint">{ko.noVersionsYet}</p>
        )}

        <ul className="version-list">
          {versions.map((v) => (
            <li key={v.name} className="version-item">
              <button
                type="button"
                className="version-row"
                onClick={() => void toggleExpand(v.name)}
              >
                <span className="version-name">{v.name}</span>
                {v.latestHistory && (
                  <span className="version-meta">
                    {new Date(v.latestHistory.savedAt).toLocaleString('ko-KR')}
                  </span>
                )}
              </button>
              {expanded === v.name && (
                <div className="history-panel">
                  {(historyMap[v.name] ?? []).length === 0 ? (
                    <p className="hint">{ko.loadingHistory}</p>
                  ) : (
                    (historyMap[v.name] ?? []).map((entry) => (
                      <div key={entry.id} className="history-row">
                        <span>{formatHistoryLabel(entry)}</span>
                        <button type="button" onClick={() => onLoad(v.name, entry.id)}>
                          {ko.loadVersion}
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    className="btn-block"
                    onClick={() => onLoad(v.name)}
                  >
                    {ko.loadLatest}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <VersionNameModal
        open={createModalOpen}
        title={ko.createNewVersion}
        confirmLabel={ko.createAndOpen}
        onConfirm={(name) => {
          setCreateModalOpen(false)
          onCreateNew(name)
        }}
        onCancel={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
