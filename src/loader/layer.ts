import {LRUCache} from 'lru-cache';
import {getEmptyImageBitmap} from './lib/get-empty-imagebitmap';
import {renderDebugInfo} from './lib/render-debug-info';
import type {RenderTile} from '../renderer/types/tile';
import {TileLoadingState} from '../renderer/types/tile';
import type {LayerProps} from './types/layer';
import {LayerDebugMode, LayerLoadingState} from './types/layer';
import {TileId} from '../tile-id';

import type RequestScheduler from './request-sheduler';

const DEFAULT_PROPS: Partial<LayerProps> = {
  debug: false,
  debugMode: LayerDebugMode.OVERLAY,
  minZoom: 1,
  maxZoom: 7,
  type: 'tile'
};

export class Layer<TUrlParameters extends Record<string, string | number> = {}> {
  scheduler: RequestScheduler<RenderTile>;
  props: LayerProps<TUrlParameters>;
  eventTarget: EventTarget;

  loadingState?: LayerLoadingState;
  visibleTileIds: Set<TileId> = new Set();
  visibleMinZoomTileIds: Set<TileId> = new Set();
  minZoomTileset: Set<TileId> | null = null;

  cache: LRUCache<string, RenderTile> = new LRUCache({max: 500});
  responseCache: LRUCache<string, Promise<ImageBitmap>> = new LRUCache({max: 1});

  constructor(
    scheduler: RequestScheduler<RenderTile>,
    props: LayerProps<TUrlParameters>,
    eventTarget: EventTarget
  ) {
    this.scheduler = scheduler;
    this.props = {...DEFAULT_PROPS, ...props};
    this.eventTarget = eventTarget;

    // make sure to initially dispatch the loading-state-change event
    this.updateLoadingState(LayerLoadingState.LOADING);
  }

  /**
   * Updates the list of currently visible tileIds coming from the tile selector.
   *
   * @param tileIds Visible tileIds
   */
  public setVisibleTileIds(tileIds: Set<TileId>) {
    const visibleTileIds = new Set<TileId>();
    const visibleMinZoomTileIds = new Set<TileId>();

    // Use only the min zoom level for fullsize layers
    if (this.isFullsize()) {
      this.visibleTileIds = this.visibleMinZoomTileIds = this.getMinZoomTileIds();
      this.updateQueue();
      return;
    }

    for (const tileId of tileIds) {
      const minZoomParent = tileId.getParentAtZoom(this.props.minZoom || 1);
      if (minZoomParent) visibleMinZoomTileIds.add(minZoomParent);

      // when maxZoom is configured, replace tiles with tiles at
      // higher zoom with tiles at max zoom.
      if (this.props.maxZoom && tileId.zoom > this.props.maxZoom) {
        const parentTile = tileId.getParentAtZoom(this.props.maxZoom);

        if (parentTile) {
          visibleTileIds.add(parentTile);
        }
      } else {
        visibleTileIds.add(tileId);
      }
    }

    this.visibleTileIds = visibleTileIds;
    this.visibleMinZoomTileIds = visibleMinZoomTileIds;

    this.updateQueue();
  }

  /**
   * Updates the layer props. Props will be merged so partial updates are ok for the first level. No
   * deep merge logic!
   *
   * @param props Layer props
   */
  public setProps(props: Partial<LayerProps<TUrlParameters>>) {
    // when switching to and from debug-mode, the cache needs to be cleared so tiles
    // will be fetched new.
    if (
      (props.debug && props.debug !== this.props.debug) ||
      (props.debugMode && props.debugMode !== this.props.debugMode)
    ) {
      this.cache.clear();
    }

    // the minZoomTileset has to be rebuilt when minZoom changes (will be rebuilt on access)
    if (props.minZoom && props.minZoom !== this.props.minZoom) {
      this.minZoomTileset = null;
    }

    this.props = {...this.props, ...props};

    this.updateLoadingState();
    this.updateQueue();
  }

  /**
   * Returns true if the layer is ready to render a frame with the given parameters. This is the
   * case when all visible tiles are ready to render.
   */
  public canRender(allowDownsampling: boolean = true) {
    // canRender could be called in the tile-update loop before the
    // tile-selector loop came around
    if (this.visibleTileIds.size === 0) {
      return false;
    }

    const tileIds = allowDownsampling ? this.visibleMinZoomTileIds : this.visibleTileIds;

    for (let tileId of tileIds) {
      const renderTile = this.getRenderTile(tileId);

      if (renderTile.loadingState !== TileLoadingState.LOADED) return false;
    }

    return true;
  }

  /**
   * Returns the best available list of render tiles to display at the moment. Will be called every
   * frame.
   *
   * @returns List of render tiles
   */
  public getRenderTiles(): RenderTile[] {
    const renderTiles = new Map<TileId, RenderTile>();
    const tileIds = new Set([...this.visibleTileIds, ...this.getMinZoomTileIds()]);

    let maxZoom = 0;

    // go through the requested tiles and see which ones can be rendered
    // or replaced with a parent
    for (const tileId of tileIds) {
      const renderTile = this.getRenderTile(tileId);

      maxZoom = Math.max(tileId.zoom, maxZoom);

      // if the tile is good to go, add it to renderTiles and continue
      if (renderTile.loadingState === TileLoadingState.LOADED) {
        this.updateTileProps(renderTile);
        renderTiles.set(tileId, renderTile);
        continue;
      }

      // the tile itself isn't ready, so find the best replacement.
      // In some cases, the children might already be loaded and could stand in
      const allChildrenLoaded = tileId.children.every(t => {
        const childRenderTile = this.getRenderTile(t, false);
        return childRenderTile && childRenderTile.loadingState === TileLoadingState.LOADED;
      });

      if (allChildrenLoaded) {
        for (let childId of tileId.children) {
          const childRenderTile = this.getRenderTile(childId);
          this.updateTileProps(childRenderTile);
          renderTiles.set(childId, childRenderTile);
        }

        renderTile.placeholderDistance = -1;
        continue;
      }

      // otherwise, find the closest renderable parent
      for (const parentTileId of tileId.getAncestors()) {
        const parentRenderTile = this.getRenderTile(parentTileId, false);
        if (parentRenderTile && parentRenderTile.loadingState === TileLoadingState.LOADED) {
          this.updateTileProps(renderTile);
          renderTile.placeholderDistance = renderTile.tileId.zoom - parentRenderTile.tileId.zoom;
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

  private updateTileProps(renderTile: RenderTile) {
    renderTile.zIndex = this.props.zIndex;
    renderTile.debug = this.props.debug;
  }

  /** Gets or creates a RenderTile instance for the specified tileId. */
  getRenderTile(tileId: TileId, createIfMissing?: true): RenderTile;
  getRenderTile(tileId: TileId, createIfMissing?: false): RenderTile | null;
  getRenderTile(tileId: TileId, createIfMissing = true): RenderTile | null {
    const url = this.getUrlForTileId(tileId);

    // use a more specific cacheKey for fullsize tiles to distinguish
    // between render tiles despite having the same tile url
    const cacheKey = this.isFullsize() ? `${url}-${tileId.id}` : url;

    let renderTile = this.cache.get(cacheKey) || null;

    if (createIfMissing && !renderTile) {
      renderTile = {
        tileId,
        url,
        urlParameters: this.props.urlParameters,
        zIndex: -1, // zIndex will be set when render tiles are retrieved for rendering
        loadingState: TileLoadingState.QUEUED,
        type: this.props.type,
        placeholderDistance: 8 // no placeholder
      };

      this.cache.set(cacheKey, renderTile);
    }

    return renderTile;
  }

  /**
   * Updates the request scheduler queue. For every new tile not already in the cache a request will
   * be scheduled.
   */
  private updateQueue() {
    const pendingTiles: RenderTile[] = [];

    // regardless of visibility, the minZoomTileset should always be completely loaded
    // (invisble parts with low priority)
    const tileIdsToLoad = new Set([...this.visibleTileIds, ...this.getMinZoomTileIds()]);

    for (let tileId of tileIdsToLoad) {
      const renderTile = this.getRenderTile(tileId);

      // anything but 'queued' means it's either loading or already complete
      if (renderTile.loadingState !== TileLoadingState.QUEUED) continue;

      // queued tiles are only skipped if they're actually in the queue (might have been
      // discarded from the queue before loading could start)
      if (this.scheduler.isScheduled(renderTile)) continue;

      pendingTiles.push(renderTile);
    }

    // fixme: this would be a place to reduce the zoomlevel when too many
    //  tiles are requested at the same time.

    // no tiles pending means all tiles are loaded or scheduled for loading, in which
    // case updateLoadingState will be called when the load completes.
    if (pendingTiles.length === 0) return;

    pendingTiles.forEach(async renderTile => {
      // if it's a new, unique request, wait for a place in the queue...
      const request = await this.scheduler.scheduleRequest(renderTile, this.getTilePriority);

      if (!request) return;

      // ...and start the request
      await this.fetch(renderTile);

      request.done();

      this.updateLoadingState();
    });

    this.updateLoadingState();
  }

  private updateLoadingState(newLoadingState?: LayerLoadingState) {
    if (!newLoadingState) {
      if (!this.canRender()) newLoadingState = LayerLoadingState.LOADING;
      else if (this.canRender(false)) newLoadingState = LayerLoadingState.IDLE;
      else newLoadingState = LayerLoadingState.READY;
    }

    if (this.loadingState !== newLoadingState) {
      this.loadingState = newLoadingState;
      this.eventTarget.dispatchEvent(
        new CustomEvent('layerLoadingStateChanged', {
          detail: {layer: this.props, state: newLoadingState}
        })
      );
    }
  }

  /**
   * Returns the priority for a requested tile depending on the zoom level - lowest levels first
   * (for now). Will return -1 if the tile is not needed anymore.
   *
   * @param renderTile The render tile
   * @returns Priority number
   */
  private getTilePriority = (renderTile: RenderTile) => {
    // what goes into the priority:
    //  - [x] zoom-level
    //    - lower zoom-levels (fewer tiles covering more area) should load before
    //      higher zoom-levels
    //  - [x] zoom-distance of placeholder (do we have something decent to replace this?)
    //    - tiles that can be replaced by its children (dz=1) are least important
    //    - tiles that can be replaced by immediate parent (dz=-1) are less important than
    //      tiles where the replacement is several zoomlevels away
    //  - [ ] covered on-screen region of the tile (maybe from tileselector?): tiles that
    //    cover a larger area are more important
    //  - [ ] focal point
    //    - tiles in the center of the screen are more important than tiles towards the edges

    // collect the contributing factors
    const isInVisibleTileIds = this.visibleTileIds.has(renderTile.tileId);
    const isMinZoom = renderTile.tileId.zoom === (this.props.minZoom || 1);
    const hasMatchingParameters = renderTile.url === this.getUrlForTileId(renderTile.tileId);
    const placeholderDistance = renderTile.placeholderDistance || 0;

    // if the layer parameters have changed, all requests will be canceled.
    if (!hasMatchingParameters) return -1;

    // when the tile is no longer visible, only minZoom tiles will resume at low priority, tiles
    // at others zoom levels will be canceled and need to queue again.
    if (!isInVisibleTileIds) {
      return isMinZoom ? 999 : -1;
    }

    // priority is primarily based on zoom-level
    let priority = renderTile.tileId.zoom * 10;

    // when there is a good replacement (i.e. replaced by children), we can safely defer
    // loading a bit
    if (placeholderDistance === -1) {
      priority += 42;
    } else if (placeholderDistance === 8) {
      priority -= 8;
    }

    // if there's no good replacement, we load with higher priority
    else {
      priority -= 6 * placeholderDistance;
    }

    return Math.max(priority, 0);
  };

  /**
   * Returns the url of a tile by calling the provided getUrl function with the layer's current url
   * parameters
   *
   * @param tileId The tileId to get the url for
   * @returns Url
   */
  private getUrlForTileId(tileId: TileId) {
    let url = this.props.getUrl({
      x: tileId.x,
      y: tileId.y,
      zoom: tileId.zoom,
      ...this.props.urlParameters
    });

    if (!this.props.debug) {
      return url;
    }

    return url + (url.includes('?') ? '&' : '?') + 'debug=' + this.props.debugMode;
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
      /**
       * Cache the last fetched image bitmap by url with a cache of size 1. This is optional (but
       * doesn't hurt) for type "tile" images but is required for "image" types to prevent making
       * multiple requests to the same url.
       *
       * Also the request promise itself is cached, not only the final data to prevent duplicated
       * requests when previous requests haven't resolved yet.
       */
      let response = this.responseCache.get(url);

      if (!response) {
        response = fetch(url)
          .then(res => res.blob())
          .then(blob => createImageBitmap(blob, {imageOrientation: 'flipY'}));

        this.responseCache.set(url, response);
      }

      renderTile.data = await response;
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
  private getMinZoomTileIds(): Set<TileId> {
    if (!this.minZoomTileset) {
      const minZoom = this.props.minZoom || 1;
      this.minZoomTileset = new Set([
        ...TileId.fromXYZ(0, 0, 0).atZoom(minZoom),
        ...TileId.fromXYZ(1, 0, 0).atZoom(minZoom)
      ]);
    }

    return this.minZoomTileset;
  }

  private isFullsize() {
    return this.props.type === 'image';
  }
}
