import {Scene, Texture} from 'three';
import {TileMesh} from './tile-mesh';

import type {TileProps, TileType} from './types/tile';
import type {TileId} from '../tile-id';
import {RenderMode} from './types/renderer';

const MAX_ZOOM = 30; // could be any number larger than max zoom-level

export class Tile {
  url: string;

  private readonly tileId: TileId;
  private readonly zIndex: number;
  private readonly scene: Scene;
  private readonly texture: Texture;
  private readonly mesh: TileMesh;
  private readonly type: TileType;

  constructor(props: TileProps) {
    this.tileId = props.tileId;
    this.zIndex = props.zIndex;
    this.url = props.url;
    this.scene = props.scene;
    this.texture = props.texture;
    this.type = props.type;

    this.mesh = new TileMesh(this.tileId, this.zIndex, this.type === 'image');
    // ensure layers are rendered from zIndex 0 -> n
    // and per layer higher zoom tiles are rendered first
    this.mesh.renderOrder = this.zIndex * MAX_ZOOM + (MAX_ZOOM - this.tileId.zoom);
    this.mesh.material.texture0 = this.texture;
    this.setRenderMode(props.renderMode);

    this.scene.add(this.mesh);
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

  setRenderMode(renderMode: RenderMode) {
    this.mesh.material.projection = renderMode === RenderMode.GLOBE ? 0.0 : 1.0;
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
