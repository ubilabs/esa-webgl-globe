import * as THREE from 'three';
import {Tile} from './tile';
import type {TileCollectionProps} from './types/tile-collection';
import type {TileData} from './types/tile';

export class TileCollection {
  readonly scene: THREE.Scene;
  tiles: Record<string, Tile>;

  constructor(props: TileCollectionProps) {
    this.scene = props.scene;
    this.tiles = {};
  }

  updateTiles(newTiles: TileData[]) {
    const newTilesMap: Record<string, TileData> = {};

    for (let i = 0; i < newTiles.length; i++) {
      // populate map to delete old tiles in second step
      const newTile = newTiles[i];
      const uniqTileId = getUniqTileId(newTile);
      newTilesMap[uniqTileId] = newTile;

      const tile = this.tiles[uniqTileId];

      // first create new tiles (new tiles which are not already in tiles)
      if (!tile) {
        this._createTile(uniqTileId, newTile);
      } else if (newTile.url !== tile.url) {
        // fade tiles that are in tiles and newTiles
        // and are identical in the sense that x, y, z, order are the same but url differs
        this._fadeTile(tile, newTile);
      }
    }

    // then remove old ones with the help of the map we build in the previous step
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
      url: tileData.url,
      scene: this.scene,
      texture
    });
  }

  private _fadeTile(tile: Tile, newTileData: TileData) {
    const texture = new THREE.CanvasTexture(newTileData.data!);
    texture.format = THREE.RGBAFormat;
    texture.flipY = true;
    texture.needsUpdate = true;

    tile.switchTexture(texture, true);
    tile.url = newTileData.url;
  }
}

function getUniqTileId(t: TileData) {
  return `${t.x}-${t.y}-${t.z}-${t.order}`;
}
