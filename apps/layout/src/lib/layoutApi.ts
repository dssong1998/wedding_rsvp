import type { CampusLayoutBundle, LayoutDocument } from '../types/layout'
import { applyStoredLayout, toStoredJson } from './campusBundle'

const VERSION_PARAM = 'version'
const HISTORY_PARAM = 'history'
const VERSION_PATH_RE = /^\/(?:layout\/)?version\/([^/?#]+)\/?$/

type LocationParts = Pick<Location, 'search' | 'pathname'>

export type LayoutVersionHistoryMeta = {
  id: number
  s3Key: string
  savedAt: string
  label: string | null
}

export type LayoutVersionMeta = {
  name: string
  s3Prefix: string
  venueId: string | null
  label: string | null
  createdAt: string
  updatedAt: string
  latestHistory?: { id: number; savedAt: string } | null
}

type LayoutVersionGetResponse = {
  meta: LayoutVersionMeta
  history: LayoutVersionHistoryMeta
  layout: Record<string, unknown>
}

type LayoutVersionListResponse = {
  items: LayoutVersionMeta[]
}

type LayoutVersionHistoryListResponse = {
  version: LayoutVersionMeta
  items: LayoutVersionHistoryMeta[]
}

type LayoutUploadPresign = {
  uploadUrl: string
  s3Key: string
  savedAt: string
  headers: { 'Content-Type': string }
  expiresIn: number
}

function apiBase(): string {
  const base = import.meta.env.VITE_API_BASE as string | undefined
  if (base?.trim()) return base.replace(/\/+$/, '')
  if (import.meta.env.DEV) return 'http://localhost:4000'
  return ''
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export type LayoutStorageStatus = {
  configured: boolean
  bucket: string | null
  prefix: string
  layout?: string
}

function parseApiErrorMessage(text: string, fallback: string): string {
  try {
    const data = JSON.parse(text) as { message?: string | string[] }
    if (Array.isArray(data.message)) return data.message.join(', ')
    if (typeof data.message === 'string') return data.message
  } catch {
    // plain text
  }
  return text.trim() || fallback
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const text = await res.text()
  return parseApiErrorMessage(text, fallback)
}

export async function fetchLayoutStorageStatus(): Promise<LayoutStorageStatus | null> {
  const base = apiBase()
  if (!base) return null

  const res = await fetch(`${base}/layout/storage/status`)
  if (!res.ok) return null
  return (await res.json()) as LayoutStorageStatus
}

export function readVersionFromLocation(
  loc: LocationParts = window.location,
): string | null {
  const params = new URLSearchParams(loc.search)
  const fromQuery = params.get(VERSION_PARAM)?.trim()
  if (fromQuery) return fromQuery

  const match = VERSION_PATH_RE.exec(loc.pathname)
  if (match?.[1]) return decodeURIComponent(match[1])

  return null
}

export function readHistoryIdFromLocation(
  loc: LocationParts = window.location,
): number | null {
  const params = new URLSearchParams(loc.search)
  const raw = params.get(HISTORY_PARAM)?.trim()
  if (!raw) return null
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) ? id : null
}

export function buildVersionUrl(
  versionName: string,
  options?: { historyId?: number; origin?: string }
): string {
  const url = new URL(`/version/${encodeURIComponent(versionName)}`, options?.origin ?? window.location.origin)
  if (options?.historyId !== undefined) {
    url.searchParams.set(HISTORY_PARAM, String(options.historyId))
  }
  return url.toString()
}

export async function fetchLayoutVersion(
  versionName: string,
  options?: { historyId?: number }
): Promise<LayoutDocument> {
  const base = apiBase()
  if (!base) {
    throw new Error('VITE_API_BASE is not configured')
  }

  let url: string
  if (options?.historyId !== undefined) {
    url = `${base}/layout/versions/${encodeURIComponent(versionName)}/history/${options.historyId}`
  } else {
    url = `${base}/layout/versions/${encodeURIComponent(versionName)}`
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(await readApiError(res, `Failed to load layout version "${versionName}" (${res.status})`))
  }

  const data = (await res.json()) as LayoutVersionGetResponse
  return applyStoredLayout(data.layout)
}

export async function listLayoutVersions(): Promise<LayoutVersionMeta[]> {
  const base = apiBase()
  if (!base) return []

  const res = await fetch(`${base}/layout/versions`)
  if (!res.ok) {
    throw new Error(`Failed to list layout versions (${res.status})`)
  }

  const data = (await res.json()) as LayoutVersionListResponse
  return data.items
}

export async function listVersionHistory(versionName: string): Promise<LayoutVersionHistoryMeta[]> {
  const base = apiBase()
  if (!base) return []

  const res = await fetch(`${base}/layout/versions/${encodeURIComponent(versionName)}/history`)
  if (!res.ok) {
    throw new Error(`Failed to list history for "${versionName}" (${res.status})`)
  }

  const data = (await res.json()) as LayoutVersionHistoryListResponse
  return data.items
}

async function presignCreateUpload(
  name: string,
  options?: { label?: string },
): Promise<LayoutUploadPresign> {
  const base = apiBase()
  if (!base) {
    throw new Error('VITE_API_BASE is not configured')
  }

  const res = await fetch(`${base}/layout/versions/presign`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, label: options?.label }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, `Failed to presign layout upload (${res.status})`))
  }

  return (await res.json()) as LayoutUploadPresign
}

async function presignAppendUpload(
  name: string,
  options?: { label?: string },
): Promise<LayoutUploadPresign> {
  const base = apiBase()
  if (!base) {
    throw new Error('VITE_API_BASE is not configured')
  }

  const res = await fetch(`${base}/layout/versions/${encodeURIComponent(name)}/presign`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ label: options?.label }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, `Failed to presign layout upload (${res.status})`))
  }

  return (await res.json()) as LayoutUploadPresign
}

async function uploadLayoutJsonToS3(
  bundle: CampusLayoutBundle,
  presign: LayoutUploadPresign,
): Promise<void> {
  const body = JSON.stringify(toStoredJson(bundle))
  const res = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.headers,
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      parseApiErrorMessage(
        text,
        `S3 upload failed (${res.status}). Check bucket CORS for this origin.`,
      ),
    )
  }
}

async function finalizeCreateLayoutVersion(
  name: string,
  s3Key: string,
  options?: { label?: string },
): Promise<{ meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }> {
  const base = apiBase()
  if (!base) {
    throw new Error('VITE_API_BASE is not configured')
  }

  const res = await fetch(`${base}/layout/versions`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, s3Key, label: options?.label }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, `Failed to create layout version (${res.status})`))
  }

  return (await res.json()) as { meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }
}

async function finalizeAppendLayoutVersion(
  name: string,
  s3Key: string,
  options?: { label?: string },
): Promise<{ meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }> {
  const base = apiBase()
  if (!base) {
    throw new Error('VITE_API_BASE is not configured')
  }

  const res = await fetch(`${base}/layout/versions/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ s3Key, label: options?.label }),
  })

  if (!res.ok) {
    throw new Error(await readApiError(res, `Failed to save layout history (${res.status})`))
  }

  return (await res.json()) as { meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }
}

export async function createLayoutVersion(
  name: string,
  bundle: CampusLayoutBundle,
  options?: { label?: string },
): Promise<{ meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }> {
  const presign = await presignCreateUpload(name, options)
  await uploadLayoutJsonToS3(bundle, presign)
  return finalizeCreateLayoutVersion(name, presign.s3Key, options)
}

export async function appendLayoutVersionHistory(
  name: string,
  bundle: CampusLayoutBundle,
  options?: { label?: string },
): Promise<{ meta: LayoutVersionMeta; history: LayoutVersionHistoryMeta }> {
  const presign = await presignAppendUpload(name, options)
  await uploadLayoutJsonToS3(bundle, presign)
  return finalizeAppendLayoutVersion(name, presign.s3Key, options)
}

export async function saveLayoutVersion(
  name: string,
  bundle: CampusLayoutBundle,
  options?: { label?: string },
): Promise<LayoutVersionHistoryMeta> {
  const trimmed = name.trim()
  const versions = await listLayoutVersions()
  const exists = versions.some((v) => v.name === trimmed)
  if (exists) {
    const result = await appendLayoutVersionHistory(trimmed, bundle, options)
    return result.history
  }
  const result = await createLayoutVersion(trimmed, bundle, options)
  return result.history
}

export function formatHistoryLabel(entry: LayoutVersionHistoryMeta): string {
  const date = new Date(entry.savedAt)
  const local = date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return entry.label ? `${local} — ${entry.label}` : local
}
