import {Scene, Texture} from 'three';
import {TileMesh} from './tile-mesh';

import type {TileProps, TileType} from './types/tile';
import type {TileId} from '../tile-id';

const MAX_ZOOM = 30; // could be any number larger than max zoom-level

export class Tile {
  url: string;

  private readonly tileId: TileId;
  private readonly zIndex: number;
  private readonly scene: Scene;
  private readonly texture: Texture;
  private readonly mesh: TileMesh;
  private readonly type: TileType;

  constructor(options: TileProps) {
    this.tileId = options.tileId;
    this.zIndex = options.zIndex;
    this.url = options.url;
    this.scene = options.scene;
    this.texture = options.texture;
    this.type = options.type;

    this.mesh = this._getMesh();
    this.scene.add(this.mesh);
  }

  private _getMesh() {
    const mesh = new TileMesh(this.tileId, this.zIndex, this.type === 'image');

    // ensure layers are rendered from zIndex 0 -> n
    // and per layer higher zoom tiles are rendered first
    mesh.renderOrder = this.zIndex * MAX_ZOOM + (MAX_ZOOM - this.tileId.zoom);
    mesh.material.texture0 = this.texture;

    return mesh;
  }

  private _fade(target: number, speed: number) {
    const v = this.mesh.material.textureFade;
    this.mesh.material.textureFade = target > v ? v + speed : v - speed;

    if (Math.abs(this.mesh.material.textureFade - target) > 0.05) {
      requestAnimationFrame(() => this._fade(target, speed));
    } else {
      this.mesh.material.textureFade = target;
    }
  }

  switchTexture(texture: Texture, fade: boolean, speed = 0.045) {
    const fadeValue = this.mesh.material.textureFade;
    const active = fadeValue < 0.5 ? 0 : 1;
    const target = active === 0 ? 1 : 0;
    const otherTexture = active === 0 ? 'texture1' : 'texture0';

    this.mesh.material[otherTexture] = texture;

    if (!fade) {
      this.mesh.material.textureFade = target;
      return;
    }

    this._fade(target, speed);
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
  }
}
