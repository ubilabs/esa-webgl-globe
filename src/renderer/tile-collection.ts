import * as THREE from 'three';
import {Tile} from './tile';
import type {TileCollectionProps} from './types/tile-collection';
import type {TileData} from './types/tile';

export class TileCollection {
  scene: THREE.Scene;
  tiles: Record<string, Tile>;
  textureLoader: THREE.TextureLoader;

  constructor(props: TileCollectionProps) {
    this.scene = props.scene;
    this.textureLoader = new THREE.TextureLoader();
    this.tiles = {};
  }

  updateTiles(newTiles: TileData[]) {
    const newTilesMap: Record<string, TileData> = {};

    for (let i = 0; i < newTiles.length; i++) {
      // populate map to delete old tiles in second step
      const newTile = newTiles[i];
      const uniqTileId = getUniqTileId(newTile);
      newTilesMap[uniqTileId] = newTile;

      // first create new tiles (new tiles which are not already in tiles)
      if (!this.tiles[uniqTileId]) {
        this._createTile(uniqTileId, newTile);
      }
    }

    // then remove old ones with the help of the map we just build
    for (const uniqTileId in this.tiles) {
      if (Object.prototype.hasOwnProperty.call(this.tiles, uniqTileId)) {
        if (!newTilesMap[uniqTileId]) {
          this.tiles[uniqTileId].destroy();
          delete this.tiles[uniqTileId];
        }
      }
    }
  }

  private _createTile(id: string, tileData: TileData) {
    const texture = new THREE.CanvasTexture(tileData.data!);
    texture.format = THREE.RGBAFormat;
    texture.flipY = true;
    texture.needsUpdate = true;

    this.tiles[id] = new Tile({
      x: tileData.x,
      y: tileData.y,
      z: tileData.z,
      order: tileData.order,
      scene: this.scene,
      texture
    });
  }
}

function getUniqTileId(t: TileData) {
  return `${t.x}-${t.y}-${t.z}-${t.url}`;
}
