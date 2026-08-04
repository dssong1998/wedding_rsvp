import type { LayoutDocument, VenueId } from '../types/layout'

export type VenueCheck = {
  label_ko: string
  ok: boolean
  detail: string
}

export function validateVenueLayout(layout: LayoutDocument): VenueCheck[] {
  const id = layout.venueId
  const checks: VenueCheck[] = []

  const tables6 = layout.items.filter((i) => i.assetId === 'table_rect_6').length
  const chairs = layout.items.filter((i) => i.assetId === 'chair_wedding').length
  const standing = layout.items.filter((i) => i.assetId === 'table_standing').length
  const easels = layout.items.filter((i) => i.assetId === 'easel_welcome').length

  if (id === 'side_garden') {
    checks.push({
      label_ko: '6인 테이블 15개',
      ok: tables6 === 15,
      detail: `${tables6}/15`,
    })
    checks.push({
      label_ko: '헤드테이블 1개',
      ok: layout.items.some((i) => i.assetId === 'head_table_round'),
      detail: layout.items.filter((i) => i.assetId === 'head_table_round').length + '개',
    })
  }

  if (id === 'main_building_1f') {
    checks.push({
      label_ko: '6인 테이블 10개',
      ok: tables6 === 10,
      detail: `${tables6}/10`,
    })
    checks.push({
      label_ko: '기둥 1개',
      ok: layout.items.some((i) => i.assetId === 'pillar_square'),
      detail: layout.items.filter((i) => i.assetId === 'pillar_square').length + '개',
    })
  }

  if (id === 'w_house') {
    checks.push({
      label_ko: '스탠딩 테이블 5개',
      ok: standing === 5,
      detail: `${standing}/5`,
    })
    checks.push({
      label_ko: '실내 의자 10개',
      ok: chairs === 10,
      detail: `${chairs}/10`,
    })
  }

  if (id === 'campus_map') {
    checks.push({
      label_ko: '웰컴 이젤 (≤64)',
      ok: easels <= 64,
      detail: `${easels}개`,
    })
  }

  return checks
}

export function venueLabel(id: VenueId): string {
  const map: Record<VenueId, string> = {
    side_garden: '사이드 가든',
    main_building_1f: '본관 1F',
    main_garden: '메인가든',
    w_house: 'W하우스',
    campus_map: '캠퍼스',
  }
  return map[id]
}
