import type { PortalDef, VenueId } from '../types/layout'

/** venue별 포털 — campus_map에서 sub-venue, sub-venue에서 campus 복귀 (120×85 그리드) */
export const VENUE_PORTALS: Partial<Record<VenueId, PortalDef[]>> = {
  campus_map: [
    {
      id: 'portal_side_garden',
      x: 16,
      y: 136,
      w: 4,
      h: 3,
      targetVenueId: 'side_garden',
      label_ko: '사이드 가든',
    },
    {
      id: 'portal_main_garden',
      x: 104,
      y: 14,
      w: 4,
      h: 3,
      targetVenueId: 'main_garden',
      label_ko: '메인가든',
    },
    {
      id: 'portal_main_building',
      x: 170,
      y: 14,
      w: 4,
      h: 3,
      targetVenueId: 'main_building_1f',
      label_ko: '본관 1F',
    },
    {
      id: 'portal_w_house',
      x: 196,
      y: 80,
      w: 4,
      h: 3,
      targetVenueId: 'w_house',
      label_ko: 'W하우스',
    },
  ],
  side_garden: [
    {
      id: 'portal_back_campus',
      x: 112,
      y: 148,
      w: 4,
      h: 2,
      targetVenueId: 'campus_map',
      label_ko: '캠퍼스 맵',
    },
  ],
  main_garden: [
    {
      id: 'portal_back_campus',
      x: 100,
      y: 144,
      w: 4,
      h: 2,
      targetVenueId: 'campus_map',
      label_ko: '캠퍼스 맵',
    },
  ],
  main_building_1f: [
    {
      id: 'portal_back_campus',
      x: 116,
      y: 100,
      w: 4,
      h: 2,
      targetVenueId: 'campus_map',
      label_ko: '캠퍼스 맵',
    },
  ],
  w_house: [
    {
      id: 'portal_back_campus',
      x: 168,
      y: 96,
      w: 4,
      h: 2,
      targetVenueId: 'campus_map',
      label_ko: '캠퍼스 맵',
    },
  ],
}

export function portalsForVenue(venueId: VenueId): PortalDef[] {
  const list = VENUE_PORTALS[venueId]
  return list ? structuredClone(list) : []
}
