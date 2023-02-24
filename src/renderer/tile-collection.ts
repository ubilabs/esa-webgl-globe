import {CanvasTexture, NearestFilter, LinearFilter, RGBAFormat, Scene} from 'three';

import {Tile} from './tile';
import type {TileCollectionProps} from './types/tile-collection';
import type {RenderTile} from './types/tile';

export class TileCollection {
  readonly scene: Scene;
  tiles: Record<string, Tile>;
  cachedTexturesByUrl: Record<string, CanvasTexture> = {};

  constructor(props: TileCollectionProps) {
    this.scene = props.scene;
    this.tiles = {};
  }

  updateTiles(newTiles: RenderTile[]) {
    const newTilesMap: Record<string, RenderTile> = {};
    this.cachedTexturesByUrl = {};

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
   * Creates a CanvasTexture for a renderTile. Caches textures by url. This has no effect for normal
   * tiles but is an optimization for full size images.
   */
  private _getTexture(renderTile: RenderTile) {
    const cachedTexture = this.cachedTexturesByUrl[renderTile.url];
    const texture = cachedTexture || new CanvasTexture(renderTile.data!);
    texture.format = RGBAFormat;
    texture.flipY = true;
    texture.needsUpdate = true;
    texture.minFilter = NearestFilter;
    texture.magFilter = LinearFilter;

    if (!cachedTexture) {
      this.cachedTexturesByUrl[renderTile.url] = texture;
    }

    return texture;
  }
}

function getUniqTileId(t: RenderTile) {
  return `${t.tileId.id}-${t.zIndex}`;
}
