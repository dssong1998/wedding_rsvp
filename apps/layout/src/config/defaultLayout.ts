import { getVenuePreset } from '../data/venues'

export {
  CELL_PX,
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  VENUE_GRID_HEIGHT,
  VENUE_GRID_WIDTH,
} from './grid'

export function createDefaultLayout() {
  return getVenuePreset('side_garden')
}
