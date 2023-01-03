import * as THREE from 'three';
import {precalcGeometries} from './precalc-geometries';
import {getTileMaterial, getTileMaterialPole} from './materials/material';

// defines for each zoom level how many segments the tile geometry should have
const ZOOM_SEGMENT_MAP: Record<number, number> = {
  0: 20,
  1: 20,
  2: 10,
  3: 6,
  4: 4,
  5: 2,
  6: 2,
  7: 1,
  8: 1,
  9: 1
};

// precalulate all geometries on start
const GEOMETRIES = precalcGeometries(ZOOM_SEGMENT_MAP);

interface RenderTileOptions {
  scene: THREE.Scene;
  zoom: number;
  x: number;
  y: number;
  texture: Promise<THREE.Texture> | THREE.CanvasTexture;
  projection: number;
  renderOffset: number;
}

export class RenderTile {
  options: RenderTileOptions;
  zoom: number;
  x: number;
  y: number;
  index: number;
  segments: number;
  isNorthRow: boolean;
  isSouthRow: boolean;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;

  constructor(options: RenderTileOptions) {
    this.options = options;

    const columns = Math.pow(2, this.options.zoom + 1);
    const rows = Math.pow(2, this.options.zoom);

    this.zoom = options.zoom;
    this.x = options.x;
    this.y = options.y;
    this.index = columns * this.y + this.x;
    this.segments = ZOOM_SEGMENT_MAP[this.zoom];
    this.isNorthRow = this.y === rows - 1;
    this.isSouthRow = this.y === 0;
    // @ts-ignore
    this.material = this._getMaterial(this.options.texture);

    this.geometry = this._getGeometry();
    this.mesh = this._getMesh(this.geometry, this.material);
    this.options.scene.add(this.mesh);
  }

  _getGeometry() {
    let geometry: THREE.PlaneGeometry | THREE.BufferGeometry = GEOMETRIES[this.segments].quad;

    if (this.isNorthRow) {
      geometry = GEOMETRIES[this.segments].quadPoleN;
    }

    if (this.isSouthRow) {
      geometry = GEOMETRIES[this.segments].quadPoleS;
    }

    return geometry;
  }

  _getMaterial(texture: THREE.Texture) {
    const uniforms = {
      zoom: {value: this.options.zoom},
      index: {value: this.index},
      texture0: {value: texture},
      texture1: {value: null},
      textureFade: {value: 0},
      projection: {value: this.options.projection},
      pole: {value: this.isNorthRow ? 1 : 0},
      poleSegments: {value: this.segments},
      size: {value: 1}
    };
    return this.isNorthRow || this.isSouthRow
      ? getTileMaterialPole(uniforms)
      : getTileMaterial(uniforms);
  }

  _getMesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = this.index;
    mesh.userData.zoom = this.options.zoom;
    mesh.renderOrder = this.options.renderOffset + this.options.zoom * 10; // ensure lower zoom tiles are rendered first
    material.depthTest = false; // required so that the render order is used correctly
    return mesh;
  }

  setUniform(key: string, value: number) {
    // @ts-ignore
    this.mesh.material.uniforms[key].value = value;
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

    this.fade(target, speed);
  }

  fade(target: number, speed: number) {
    // @ts-ignore
    const uniforms = this.material.uniforms;
    const v = uniforms.textureFade.value;
    uniforms.textureFade.value = target > v ? v + speed : v - speed;

    if (Math.abs(uniforms.textureFade.value - target) > 0.05) {
      requestAnimationFrame(() => this.fade(target, speed));
    } else {
      uniforms.textureFade.value = target;
    }
  }

  remove() {
    this.options.scene.remove(this.mesh);
    this.material.dispose();
    this.geometry.dispose();
  }
}
