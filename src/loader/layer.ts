import LRU from 'lru-cache';
import {getEmptyImageBitmap} from './lib/get-empty-imagebitmap';
import {renderDebugInfo} from './lib/render-debug-info';
import {TileLoadingState} from '../renderer/types/tile';
import {LayerDebugMode} from './types/layer';
import {TileId} from '../tile-id';

import type RequestScheduler from './request-sheduler';
import type {RenderTile} from '../renderer/types/tile';
import type {LayerProps} from './types/layer';

export class Layer<UrlParameters = unknown> {
  scheduler: RequestScheduler<RenderTile>;
  props: LayerProps<UrlParameters>;
  visibleTileIds: Set<TileId> = new Set();
  cache: LRU<string, RenderTile> = new LRU({max: 500});
  lastRenderTiles: Map<TileId, RenderTile> = new Map();

  constructor(scheduler: RequestScheduler<RenderTile>, props: LayerProps<UrlParameters>) {
    this.scheduler = scheduler;
    this.props = props;
  }

  /**
   * Updates the list of currently visible tileIds coming from the tile selector.
   *
   * @param tileIds Visible tileIds
   */
  public setVisibleTileIds(tileIds: Set<TileId>) {
    const visibleTileIds = new Set<TileId>();

    // Clamp zoom level of tiles to layer's maxZoom
    for (const tileId of tileIds) {
      if (tileId.zoom > this.props.maxZoom) {
        const parentTile = tileId.getParentAtZoom(this.props.maxZoom);

        if (parentTile) {
          visibleTileIds.add(parentTile);
        }
      } else {
        visibleTileIds.add(tileId);
      }
    }

    this.visibleTileIds = visibleTileIds;
    this.updateQueue();
  }

  /**
   * Updates the layer props. Props will be merged so partial updates are ok for the first level. No
   * deep merge logic!
   *
   * @param props Layer props
   */
  public setProps(props: Partial<LayerProps<UrlParameters>>) {
    this.props = {...this.props, ...props};
    this.updateQueue();
  }

  /**
   * Returns the best available list of render tiles to display at the moment. Will be called every
   * frame.
   *
   * @returns List of render tiles
   */
  public getRenderTiles(): RenderTile[] {
    const renderTiles = new Map<TileId, RenderTile>();

    let maxZoom = 0;

    // go through the requested tiles and see which ones can be rendered
    // or replaced with a parent
    for (const tileId of this.getTileIdsToShow()) {
      const renderTile = this.getRenderTile(tileId);

      maxZoom = Math.max(tileId.zoom, maxZoom);

      // if the tile is good to go, add it to renderTiles and continue
      if (renderTile.loadingState === TileLoadingState.LOADED) {
        renderTile.zIndex = this.props.zIndex;
        renderTiles.set(tileId, renderTile);
        continue;
      }

      // in some cases, the children might already be loaded and could stand in
      const allChildrenLoaded = tileId.children.every(t => {
        const childRenderTile = this.getRenderTile(t, false);
        return childRenderTile && childRenderTile.loadingState === TileLoadingState.LOADED;
      });
      if (allChildrenLoaded) {
        for (let childId of tileId.children) {
          renderTiles.set(childId, this.getRenderTile(childId));
        }
        continue;
      }

      // otherwise, find the closest renderable parent
      for (const parentTileId of tileId.getAncestors()) {
        const parentRenderTile = this.getRenderTile(parentTileId, false);
        if (parentRenderTile && parentRenderTile.loadingState === TileLoadingState.LOADED) {
          renderTile.zIndex = this.props.zIndex;
          renderTiles.set(parentTileId, parentRenderTile);
          break;
        }
      }
    }

    // remove all tiles where all children are in the list
    const renderTileIds = new Set(renderTiles.keys());
    for (let tileId of renderTileIds) {
      if (tileId.zoom === maxZoom) continue;

      if (tileId.children.every(c => renderTileIds.has(c))) {
        renderTiles.delete(tileId);
      }
    }

    return Array.from(renderTiles.values());
  }

  /**
   * Gets or creates a RenderTile instance for the specified tileId.
   *
   * @param tileId
   */
  getRenderTile(tileId: TileId, createIfMissing?: true): RenderTile;
  getRenderTile(tileId: TileId, createIfMissing?: false): RenderTile | null;
  getRenderTile(tileId: TileId, createIfMissing = true): RenderTile | null {
    const url = this.getUrlForTileId(tileId);

    let renderTile = this.cache.get(url) || null;
    if (createIfMissing && !renderTile) {
      renderTile = {
        tileId,
        url,
        zIndex: -1, // zIndex will be set when render tiles are retrieved for rendering
        loadingState: TileLoadingState.QUEUED
      };

      this.cache.set(url, renderTile);
    }

    return renderTile;
  }

  /**
   * Returns the optimal list of tiles to load/render based on the optimal tileset we get from the
   * tile-selector.
   */
  getTileIdsToShow() {
    // fixme: very basic implementation, should take more factors into account, maybe should
    //   even live somewhere else, as much of the logic can be shared among layers.
    return new Set([...this.visibleTileIds, ...this.getMinZoomTileset()]);
  }

  /**
   * Updates the request scheduler queue. For every new tile not already in the cache a request will
   * be scheduled.
   */
  private updateQueue() {
    const tileIdsToShow = this.getTileIdsToShow();

    tileIdsToShow.forEach(async tileId => {
      const renderTile = this.getRenderTile(tileId);

      // anything else but queued means it's either loading or already complete
      if (renderTile.loadingState !== TileLoadingState.QUEUED) return;

      // only skip queued tiles if they're actually in the queue (might have been
      // discarded from the queue before loading could start)
      if (this.scheduler.isScheduled(renderTile)) return;

      // if it's a new, unique request, wait for a place in the queue...
      const request = await this.scheduler.scheduleRequest(renderTile, this.getTilePriority);

      if (!request) return;

      // ...and start the request
      await this.fetch(renderTile);
      request.done();
    });
  }

  /**
   * Returns the priority for a requested tile depending on the zoom level - lowest levels first
   * (for now). Will return -1 if the tile is not needed anymore.
   *
   * @param renderTile The render tile
   * @returns Priority number
   */
  private getTilePriority = (renderTile: RenderTile) => {
    // check if tileId is still visible and if parameters have not changed
    const isInVisibleTileIds = this.visibleTileIds.has(renderTile.tileId);
    const hasMatchingParameters = renderTile.url === this.getUrlForTileId(renderTile.tileId);

    // if true then we still want this tile
    if (isInVisibleTileIds && hasMatchingParameters) {
      // invert priority to get the highest priority for lowest zoom levels
      return 100 - renderTile.tileId.zoom;
    }

    // otherwise cancel the request
    return -1;
  };

  /**
   * Returns the url of a tile by calling the provided getUrl function with the layer's current url
   * parameters
   *
   * @param tileId The tileId to get the url for
   * @returns Url
   */
  private getUrlForTileId(tileId: TileId) {
    return this.props.getUrl({
      x: tileId.x,
      y: tileId.y,
      zoom: tileId.zoom,
      ...this.props.urlParameters
    });
  }

  /**
   * Fetches and sets a render tile's image data. The data property will be set to an ImageBitmap
   * object. In case of an error the image data will be set to an empty 1x1px sizes ImageBitmap as a
   * fallback.
   *
   * Calls the request scheduler's done() function when when complete.
   *
   * @param renderTile The render tile
   */
  private async fetch(renderTile: RenderTile) {
    const {url} = renderTile;

    renderTile.loadingState = TileLoadingState.LOADING;

    if (this.props.debug && this.props.debugMode !== LayerDebugMode.OVERLAY) {
      renderTile.data = await renderDebugInfo(renderTile);
      renderTile.loadingState = TileLoadingState.LOADED;

      return;
    }

    try {
      const blob = await fetch(url).then(res => res.blob());

      renderTile.data = await createImageBitmap(blob, {imageOrientation: 'flipY'});
      renderTile.loadingState = TileLoadingState.LOADED;
    } catch (err: unknown) {
      // fallback to empty imageBitmap in case of error
      renderTile.data = await getEmptyImageBitmap();
      renderTile.loadingState = TileLoadingState.ERROR;
      console.warn(err);
    }

    if (this.props.debug) {
      renderTile.data = await renderDebugInfo(renderTile);
    }
  }

  /**
   * Creates a derived tileset that contains only tiles at minZoom (default 1) covering at least the
   * same area as the specified tiles.
   */
  private getMinZoomTileset(): Set<TileId> {
    const minZoom = this.props.minZoom || 1;
    return new Set([
      ...TileId.fromXYZ(0, 0, 0).atZoom(minZoom),
      ...TileId.fromXYZ(1, 0, 0).atZoom(minZoom)
    ]);
  }
}
