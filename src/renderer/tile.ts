import {BufferGeometry, Material, Mesh, Scene, Texture} from 'three';

import {precalcGeometries} from './lib/precalc-geometries';
import {getTileMaterial, getTileMaterialPole} from './lib/get-tile-material';
import {ZOOM_SEGMENT_MAP} from './config';
import type {TileProps} from './types/tile';
import type {TileId} from '../tile-id';

// precalulate all geometries on start
const GEOMETRIES = precalcGeometries(Object.values(ZOOM_SEGMENT_MAP));
const MAX_ZOOM = 30; // just a high enough number

export class Tile {
  url: string;
  readonly tileId: TileId;
  readonly zIndex: number;
  readonly scene: Scene;
  readonly texture: TileProps['texture'];
  readonly segments: number;
  readonly isNorthRow: boolean;
  readonly isSouthRow: boolean;
  readonly material: Material;
  readonly geometry: BufferGeometry;
  readonly mesh: Mesh;
  readonly type: TileProps['type'];

  constructor(options: TileProps) {
    this.tileId = options.tileId;
    this.zIndex = options.zIndex;
    this.url = options.url;
    this.scene = options.scene;
    this.texture = options.texture;
    this.type = options.type;

    const rows = Math.pow(2, this.tileId.zoom);

    this.segments = ZOOM_SEGMENT_MAP[this.tileId.zoom];
    this.isNorthRow = this.tileId.y === rows - 1;
    this.isSouthRow = this.tileId.y === 0;
    // @ts-ignore
    this.material = this._getMaterial(this.texture, options.zIndex);
    this.geometry = this._getGeometry();
    this.mesh = this._getMesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  private _getGeometry() {
    const geometryType = this.isNorthRow ? 'north' : this.isSouthRow ? 'south' : 'normal';

    return GEOMETRIES[this.segments][geometryType];
  }

  private _getMaterial(texture: Texture, zIndex: number) {
    const uniforms = {
      x: {value: this.tileId.x},
      y: {value: this.tileId.y},
      zoom: {value: this.tileId.zoom},
      texture0: {value: texture},
      texture1: {value: null},
      textureFade: {value: 0},
      projection: {value: 0},
      pole: {value: this.isNorthRow ? 1 : 0},
      poleSegments: {value: this.segments},
      isFullSize: {value: this.type === 'tile' ? 0 : 1}
    };
    return this.isNorthRow || this.isSouthRow
      ? getTileMaterialPole(uniforms, zIndex)
      : getTileMaterial(uniforms, zIndex);
  }

  private _getMesh(geometry: BufferGeometry, material: Material) {
    const mesh = new Mesh(geometry, material);

    // ensure layers are rendered from zIndex 0 -> n
    // and per layer higher zoom tiles are rendered first
    mesh.renderOrder = this.zIndex * MAX_ZOOM + (MAX_ZOOM - this.tileId.zoom);

    return mesh;
  }

  private _fade(target: number, speed: number) {
    // @ts-ignore
    const uniforms = this.material.uniforms;
    const v = uniforms.textureFade.value;
    uniforms.textureFade.value = target > v ? v + speed : v - speed;

    if (Math.abs(uniforms.textureFade.value - target) > 0.05) {
      requestAnimationFrame(() => this._fade(target, speed));
    } else {
      uniforms.textureFade.value = target;
    }
  }

  switchTexture(texture: Texture, fade: boolean, speed = 0.045) {
    // @ts-ignore
    const fadeValue = this.material.uniforms.textureFade.value;
    const active = fadeValue < 0.5 ? 0 : 1;
    const target = active === 0 ? 1 : 0;
    const otherTexture = active === 0 ? 'texture1' : 'texture0';

    // @ts-ignore
    this.material.uniforms[otherTexture].value = texture;

    if (!fade) {
      // @ts-ignore
      this.material.uniforms.textureFade.value = target;
      return;
    }

    this._fade(target, speed);
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.geometry.dispose();
  }
}
