import {BufferGeometry, Mesh, ShaderMaterial} from 'three';

import {precalcGeometries} from './lib/precalc-geometries';
import {getTileMaterial, getTileMaterialPole} from './lib/get-tile-material';
import {ZOOM_SEGMENT_MAP} from './config';
import type {TileId} from '../tile-id';

// precalulate all geometries on start
const GEOMETRIES = precalcGeometries(Object.values(ZOOM_SEGMENT_MAP));

// NOTE: Textures aren't initialized
// NOTE: renderOrder not handled

export class TileMesh extends Mesh<BufferGeometry, ShaderMaterial> {
  readonly isTileMesh = true;

  readonly tileId: TileId;
  readonly zIndex: number;
  // readonly isPolarTile: boolean;
  // readonly pole: Pole;

  constructor(tileId: TileId, zIndex: number, isFullSize: boolean) {
    super(TileMesh.createGeometry(tileId), TileMesh.createMaterial(tileId, zIndex, isFullSize));

    this.tileId = tileId;
    this.zIndex = zIndex;

    // this.isPolarTile = tileId.y === (1 << tileId.zoom) - 1 || tileId.y === 0;
    // this.pole = tileId.y === 0 ? Pole.SOUTH : Pole.NORTH;
  }

  private static createGeometry(tileId: TileId) {
    const segments = ZOOM_SEGMENT_MAP[tileId.zoom];
    const isNorthRow = tileId.y === (1 << tileId.zoom) - 1;
    const isSouthRow = tileId.y === 0;

    const geometryType = isNorthRow ? 'north' : isSouthRow ? 'south' : 'normal';

    return GEOMETRIES[segments][geometryType];
  }

  private static createMaterial(tileId: TileId, zIndex: number, isFullSize: boolean) {
    const segments = ZOOM_SEGMENT_MAP[tileId.zoom];
    const isNorthRow = tileId.y === (1 << tileId.zoom) - 1;
    const isSouthRow = tileId.y === 0;

    const uniforms = {
      tile: {value: [tileId.x, tileId.y, tileId.zoom]},
      texture0: {value: null},
      texture1: {value: null},
      textureFade: {value: 0},
      projection: {value: 0},
      pole: {value: isNorthRow ? 1 : 0},
      poleSegments: {value: segments},
      isFullSize: {value: isFullSize}
    };

    return isNorthRow || isSouthRow
      ? getTileMaterialPole(uniforms, zIndex)
      : getTileMaterial(uniforms, zIndex);
  }

  dispose() {
    this.material.dispose();
    this.geometry.dispose();
  }
}

// const enum Pole {
//   SOUTH = 0,
//   NORTH = 1
// }
