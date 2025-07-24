import { LRUCache } from 'lru-cache';

import { CanvasTexture, NearestFilter, NearestMipmapNearestFilter, Scene } from 'three';

import { Tile } from './tile';
import type { RenderTile } from './types/tile';
import { RenderMode } from './types/renderer';

export class TileManager {
  readonly scene: Scene;
  tiles: Record<string, Tile>;
  // optimisation for image textures to prevent multiple GPU uploads for same image data
  textureCache: LRUCache<string, CanvasTexture> = new LRUCache({ max: 1 });

  private renderMode: RenderMode = RenderMode.GLOBE;

  constructor(scene: Scene) {
    this.scene = scene;
    this.tiles = {};
  }

  updateTiles(newTiles: RenderTile[]) {
    // Here is what needs to happen:
    //
    // When iterating over the new tiles, two situations can occur:
    //
    // (a) the new tiles could be more detailed than the old tiles (so, for an old tile of
    //     z=2, the new tiles contain at least one of the z>2 children of that tile).
    //     This would typically be the case while tiles are being loaded.
    //
    // (b) the new tiles could have a lower resolution than the old ones (for an old tile
    //     at z=4, only a parent tile is available in the new tiles). This would be the
    //     case when either the higher resolution is no longer needed or - more
    //     significantly - when switching from one timestep to the next.
    //
    // In both of these cases, we want to split the lower-resolution tile into the child-tiles
    // (at the appropriate level) so we can transition between the tiles. In case (a) this would
    // affect the old tile while in case (b) the split happens for the new tile.
    //
    // Since the split meshes will reuse the textures for the most part, it should be possible
    // to instantaneously switch between the different versions before the animation is started.
    //
    //
    // To investigate:
    //
    // - what happens if this switch happens while an animation is already running?
    //   When could that happen and would it be noticeable?
    //   Should we try to queue and chain the animations somehow?
    //
    // - will hard-shifting from one geometry to the other produce pixel-jumps?

    const newTilesMap: Record<string, RenderTile> = {};

    for (let i = 0; i < newTiles.length; i++) {
      // populate map to delete old tiles in second step
      const newTile = newTiles[i];
      const uniqTileId = getUniqTileId(newTile);
      newTilesMap[uniqTileId] = newTile;

      const tile = this.tiles[uniqTileId];

      if (tile && tile.url === newTile.url) continue;

      // first create new tiles (new tiles which are not already in tiles)
      if (!tile) {
        this._createTile(uniqTileId, newTile);
      } else {
        // fade tiles that are in tiles and newTiles
        // and are identical in the sense that x, y, z, zIndex are the same but url differs
        this._updateTileTexture(tile, newTile);
      }
    }

    // remove tiles that are no longer needed
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
      type: renderTile.type ?? 'tile',
      renderMode: this.renderMode
    });
  }

  private _updateTileTexture(tile: Tile, newRenderTile: RenderTile) {
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
    const useCache = !renderTile.debug;
    const cachedTexture = useCache ? this.textureCache.get(renderTile.url) : null;
    const texture = cachedTexture || new CanvasTexture(renderTile.data!);

    texture.flipY = true;
    texture.needsUpdate = true;
    texture.minFilter = NearestMipmapNearestFilter;
    texture.magFilter = NearestFilter;

    this.textureCache.set(renderTile.url, texture);

    return texture;
  }

  setRenderMode(renderMode: RenderMode) {
    if (renderMode === this.renderMode) {
      return;
    }

    for (let tile of Object.values(this.tiles)) {
      tile.setRenderMode(renderMode);
    }

    this.renderMode = renderMode;
  }
}

function getUniqTileId(t: RenderTile) {
  return `${t.tileId.id}-${t.zIndex}-${t.type}`;
}
