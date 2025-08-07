// defines for each zoom level how many segments the tile geometry should have
export const ZOOM_SEGMENT_MAP: Record<number, number> = {
  0: 20,
  1: 20,
  2: 10,
  3: 6,
  4: 4,
  5: 2,
  6: 2,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
  11: 1
};

export const MAP_WIDTH = 4;
export const MAP_HEIGHT = 2;

export const GLOBE_VIEWPORT_WIDTH_PERCENTAGE = 0.4;

// make sure this aligns with the bp in the FE app
export const MOBILE_BREAKPOINT_WIDTH = 767
export const MOBILE_HORIZONTAL_FOV = 27
