import * as THREE from 'three';

import {RenderTile} from './render-tile';
import {getDebugTexture} from './debug-texture';

export interface TileDefinition {
  zoom: number;
  x: number;
  y: number;
  url: string;
}

interface GlobeOptions {
  scene: THREE.Scene;
  projection: number;
  renderOffset: number;
}

export class Globe {
  scene: THREE.Scene;
  options: GlobeOptions;
  tiles: RenderTile[];
  textureLoader: THREE.TextureLoader;

  constructor(options: GlobeOptions) {
    this.scene = options.scene;
    this.options = options;
    this.textureLoader = new THREE.TextureLoader();
    this.tiles = [];
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.ImageLoader();
      loader.load(
        url,
        image => {
          const texture = new THREE.Texture(image);
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  async updateTiles(newTiles: TileDefinition[]) {
    // search for tiles to remove (tiles that already exist but are not in newTiles)
    const tilesToRemove = this.tiles.filter(
      tile =>
        newTiles.find(
          newTile => newTile.x === tile.x && newTile.y === tile.y && newTile.zoom === tile.zoom
        ) === undefined
    );

    for (let i = tilesToRemove.length - 1; i >= 0; i--) {
      const tile = tilesToRemove[i];
      this.tiles.splice(this.tiles.indexOf(tile), 1);
      tile.remove();
    }

    // search for tiles to create (new tiles which are not already in tiles)
    for (let i = 0; i < newTiles.length; i++) {
      const newTile = newTiles[i];
      const existingIndex = this.tiles.findIndex(
        tile => tile.x === newTile.x && tile.y === newTile.y && tile.zoom === newTile.zoom
      );

      // create new tile if it does not exist yet
      if (existingIndex < 0) {
        const tileUrl = `${newTile.url}/${newTile.zoom}/${newTile.x}/${newTile.y}.png`;
        const texture = newTile.url.startsWith('debug')
          ? getDebugTexture(newTile)
          : this.loadTexture(tileUrl);

        const tile = new RenderTile({
          scene: this.scene,
          zoom: newTile.zoom,
          x: newTile.x,
          y: newTile.y,
          texture,
          renderOffset: this.options.renderOffset,
          projection: 0
        });
        this.tiles.push(tile);
      }
    }
  }

  updateUniform(key: string, value: number) {
    this.tiles.forEach(tile => tile.setUniform(key, value));
  }
}
