import {BufferGeometry, PlaneGeometry} from 'three';

export function precalcGeometries(segmentCounts: number[]): {
  [numSegments: number]: BufferGeometry;
} {
  const ret: ReturnType<typeof precalcGeometries> = {};
  for (let numSegments of new Set(segmentCounts)) {
    ret[numSegments] = new PlaneGeometry(2, 2, numSegments, numSegments);
  }

  return ret;
}
