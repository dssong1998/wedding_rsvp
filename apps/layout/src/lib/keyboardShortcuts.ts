/** Ctrl/Cmd+Shift — 브라우저 탭·북마크·실행취소 단축키와 충돌 회피 */
export function isAppChord(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey
}

export function matchesAppChord(e: KeyboardEvent, key: string): boolean {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const target = key.length === 1 ? key.toLowerCase() : key
  return isAppChord(e) && k === target
}

export function matchesPlainKey(
  e: KeyboardEvent,
  key: string,
  opts?: { requireNoModifiers?: boolean },
): boolean {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const target = key.length === 1 ? key.toLowerCase() : key
  if (k !== target) return false
  if (opts?.requireNoModifiers && (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
    return false
  }
  return true
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
}

/** UI 배지용 (Mac: ⇧⌘Z, Win: Ctrl+Shift+Z) */
export function chordLabel(key: string): string {
  const display = key.length === 1 ? key.toUpperCase() : key
  if (isMacPlatform()) return `⇧⌘${display}`
  return `Ctrl+Shift+${display}`
}

export function chordNumberLabel(n: number): string {
  return chordLabel(String(n))
}

export function formatShortcutHints(): string {
  return (
    `${chordLabel('Z')}: 실행 취소 · C: 복제 · D: 삭제 · R: 회전 · ` +
    `[ / ]: 확대/축소 · ${chordNumberLabel(1)}~${chordNumberLabel(5)}: 추천 타일 · Shift+클릭: 다중 선택 · ` +
    `Shift+드래그: 영역 채우기 · ${chordLabel('B')}: 배경 수정`
  )
}
