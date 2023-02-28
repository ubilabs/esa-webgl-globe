import LRU from 'lru-cache';
import {CanvasTexture, NearestFilter, RGBAFormat, Scene} from 'three';

import {Tile} from './tile';
import type {TileCollectionProps} from './types/tile-collection';
import type {RenderTile} from './types/tile';

export class TileCollection {
  readonly scene: Scene;
  tiles: Record<string, Tile>;
  // optimisation for image textures to prevent multiple GPU uploads for same image data
  textureCache: LRU<string, CanvasTexture> = new LRU({max: 1});

  constructor(props: TileCollectionProps) {
    this.scene = props.scene;
    this.tiles = {};
  }

  updateTiles(newTiles: RenderTile[]) {
    const newTilesMap: Record<string, RenderTile> = {};

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
        // and are identical in the sense that x, y, z, zIndex are the same but url differs
        this._fadeTile(tile, newTile);
      }
    }

    // then remove old ones with the help of the map we build in the previous step
    for (const uniqTileId of Object.keys(this.tiles)) {
      if (newTilesMap[uniqTileId]) continue;

      this.tiles[uniqTileId].destroy();
      delete this.tiles[uniqTileId];
    }

    // clean texture cache when a new layer is displayed
    if (!newTiles.length) {
    }
  }

  private _createTile(id: string, renderTile: RenderTile) {
    const texture = this._getTexture(renderTile);

    this.tiles[id] = new Tile({
      tileId: renderTile.tileId,
      zIndex: renderTile.zIndex,
      url: renderTile.url,
      scene: this.scene,
      texture,
      type: renderTile.type ?? 'tile'
    });
  }

  private _fadeTile(tile: Tile, newRenderTile: RenderTile) {
    const texture = this._getTexture(newRenderTile);

    tile.switchTexture(texture, true);
    tile.url = newRenderTile.url;
  }

  /**
   * Creates a CanvasTexture for a renderTile. Caches the last created texture. This has no effect
   * for normal tiles but is an optimization for full size images, so that subsequent textures with
   * the same url use the same texture instance and will be uploaded only once to the GPU.
   */
  private _getTexture(renderTile: RenderTile) {
    const cachedTexture = this.textureCache.get(renderTile.url);
    const texture = cachedTexture || new CanvasTexture(renderTile.data!);
    texture.format = RGBAFormat;
    texture.flipY = true;
    texture.needsUpdate = true;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;

    this.textureCache.set(renderTile.url, texture);

    return texture;
  }
}

function getUniqTileId(t: RenderTile) {
  return `${t.tileId.id}-${t.zIndex}`;
}
