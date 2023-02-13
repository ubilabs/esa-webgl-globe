import {PlaneGeometry} from 'three';

import {getPoleGeometry} from './get-pole-geometry';

/*
 * Precalc all possible geometries for zoom levels. Returns geometries map as {[segments]: {}}:
 * {
 *  0: {normal, north, south},
 *  2: {normal, north, outh},
 *  ...
 * }
 */
export function precalcGeometries(ZOOM_SEGMENT_MAP: Record<number, number>) {
  const segmentVariations = Object.values(ZOOM_SEGMENT_MAP);
  const geometries = segmentVariations.map(segments => {
    const normal = new PlaneGeometry(2, 2, segments, segments);
    const north = getPoleGeometry(segments, true);
    const south = getPoleGeometry(segments, false);

    return {
      segments,
      normal,
      north,
      south
    };
  });

  return geometries.reduce((all, g) => ({...all, [g.segments]: g}), {}) as Record<
    number,
    (typeof geometries)[0]
  >;
}
