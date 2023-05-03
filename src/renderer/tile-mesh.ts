import {BufferGeometry, Mesh} from 'three';

import {precalcGeometries} from './lib/precalc-geometries';
import {TileMaterial} from './tile-material';
import {ZOOM_SEGMENT_MAP} from './config';
import type {TileId} from '../tile-id';

// precalulate all geometries on start
const GEOMETRIES_BY_SEGMENT_COUNT = precalcGeometries(Object.values(ZOOM_SEGMENT_MAP));

export class TileMesh extends Mesh<BufferGeometry, TileMaterial> {
  readonly isTileMesh = true;

  readonly tileId: TileId;
  readonly zIndex: number;

  constructor(tileId: TileId, zIndex: number, isFullSize: boolean) {
    super(
      GEOMETRIES_BY_SEGMENT_COUNT[ZOOM_SEGMENT_MAP[tileId.zoom]],
      new TileMaterial({tileId, zIndex, isFullSize})
    );

    this.tileId = tileId;
    this.zIndex = zIndex;
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}
