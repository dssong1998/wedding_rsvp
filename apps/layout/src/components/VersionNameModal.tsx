import { useEffect, useState } from 'react'
import { ko } from '../locale/ko'

const VERSION_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

type Props = {
  open: boolean
  title: string
  confirmLabel: string
  initialName?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function VersionNameModal({
  open,
  title,
  confirmLabel,
  initialName = '',
  onConfirm,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError(null)
    }
  }, [open, initialName])

  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(ko.versionNameRequired)
      return
    }
    if (!VERSION_NAME_RE.test(trimmed)) {
      setError(ko.versionNameInvalid)
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>{title}</h2>
        <label className="field-label" htmlFor="version-name-input">
          {ko.versionName}
        </label>
        <input
          id="version-name-input"
          type="text"
          className="text-input"
          value={name}
          placeholder="wedding-v1"
          autoFocus
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onCancel()
          }}
        />
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            {ko.cancel}
          </button>
          <button type="button" className="primary" onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
