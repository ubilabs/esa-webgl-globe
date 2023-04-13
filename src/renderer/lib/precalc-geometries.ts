import {BufferGeometry, PlaneGeometry} from 'three';
import {getPoleGeometry} from './get-pole-geometry';

export type GeometryType = 'normal' | 'north' | 'south';

/** Precalculates all possible for the different zoom levels. */
export function precalcGeometries(segmentCounts: number[]): {
  [numSegments: number]: {
    [key in GeometryType]: BufferGeometry;
  };
} {
  const ret: ReturnType<typeof precalcGeometries> = {};
  for (let numSegments of new Set(segmentCounts)) {
    ret[numSegments] = {
      normal: new PlaneGeometry(2, 2, numSegments, numSegments),
      north: getPoleGeometry(numSegments, true),
      south: getPoleGeometry(numSegments, false)
    };
  }

  return ret;
}
