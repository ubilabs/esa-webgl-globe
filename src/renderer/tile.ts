import * as THREE from 'three';
import {precalcGeometries} from './lib/precalc-geometries';
import {getTileMaterial, getTileMaterialPole} from './lib/materials/material';
import {ZOOM_SEGMENT_MAP} from './config';
import type {TileProps} from './types/tile';

// precalulate all geometries on start
const GEOMETRIES = precalcGeometries(ZOOM_SEGMENT_MAP);

export class Tile {
  x: number;
  y: number;
  z: number;
  order: number;
  scene: THREE.Scene;
  texture: TileProps['texture'];
  index: number;
  segments: number;
  isNorthRow: boolean;
  isSouthRow: boolean;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;

  constructor(options: TileProps) {
    this.x = options.x;
    this.y = options.y;
    this.z = options.z;
    this.order = options.order;
    this.scene = options.scene;
    this.texture = options.texture;

    const columns = Math.pow(2, this.z + 1);
    const rows = Math.pow(2, this.z);

    this.index = columns * this.y + this.x;
    this.segments = ZOOM_SEGMENT_MAP[this.z];
    this.isNorthRow = this.y === rows - 1;
    this.isSouthRow = this.y === 0;
    // @ts-ignore
    this.material = this._getMaterial(this.texture);
    this.geometry = this._getGeometry();
    this.mesh = this._getMesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  private _getGeometry() {
    let geometry: THREE.BufferGeometry = GEOMETRIES[this.segments].normal;

    if (this.isNorthRow) {
      geometry = GEOMETRIES[this.segments].north;
    }

    if (this.isSouthRow) {
      geometry = GEOMETRIES[this.segments].south;
    }

    return geometry;
  }

  private _getMaterial(texture: THREE.Texture) {
    const uniforms = {
      zoom: {value: this.z},
      index: {value: this.index},
      texture0: {value: texture},
      texture1: {value: null},
      textureFade: {value: 0},
      projection: {value: 0},
      pole: {value: this.isNorthRow ? 1 : 0},
      poleSegments: {value: this.segments}
    };
    return this.isNorthRow || this.isSouthRow
      ? getTileMaterialPole(uniforms)
      : getTileMaterial(uniforms);
  }

  private _getMesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = this.index;
    mesh.userData.zoom = this.z;
    mesh.renderOrder = this.z * 100 + this.order; // ensure lower zoom tiles are rendered first
    material.depthTest = false; // required so that the render order is used correctly
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

  switchTexture(texture: THREE.Texture, noFade: boolean) {
    // @ts-ignore
    const fade = this.material.uniforms.textureFade.value;
    const active = fade < 0.5 ? 0 : 1;
    const target = active === 0 ? 1 : 0;
    const otherTexture = active === 0 ? 'texture1' : 'texture0';

    // @ts-ignore
    this.material.uniforms[otherTexture].value = texture;

    if (noFade) {
      // @ts-ignore
      this.material.uniforms.textureFade.value = target;
      return;
    }

    const speed = 0.045;

    this._fade(target, speed);
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.geometry.dispose();
  }
}