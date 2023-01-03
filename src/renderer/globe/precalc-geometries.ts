import * as THREE from 'three';
import {getPoleGeometry} from './get-pole-geometry';

/*
 * Precalc all possible geometries for zoom levels. Returns geometries map as {[segments]: {}}:
 * {
 *  0: {quad, quadPoleN, quadPoleS},
 *  2: {quad, quadPoleN, quadPoleS},
 *  ...
 * }
 */
export function precalcGeometries(ZOOM_SEGMENT_MAP: Record<number, number>) {
  const segmentVariations = Object.values(ZOOM_SEGMENT_MAP);
  const geometries = segmentVariations.map(segments => {
    const quad = new THREE.PlaneGeometry(2, 2, segments, segments);
    const quadPoleN = getPoleGeometry(segments, true);
    const quadPoleS = getPoleGeometry(segments, false);

    return {
      segments,
      quad,
      quadPoleN,
      quadPoleS
    };
  });

  return geometries.reduce((all, g) => ({...all, [g.segments]: g}), {}) as Record<
    number,
    typeof geometries[0]
  >;
}
