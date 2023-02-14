import LRU from 'lru-cache';
import {getEmptyImageBitmap} from './lib/get-empty-imagebitmap';
import {TileLoadingState} from '../renderer/types/tile';
import {LayerDebugMode} from './types/layer';

import type {TileId} from '../tile-id';
import type RequestScheduler from './request-sheduler';
import type {RenderTile} from '../renderer/types/tile';
import type {LayerProps} from './types/layer';

const DEBUG_COLORS = [
  [12, 10, 62],
  [123, 30, 122],
  [179, 63, 98],
  [249, 86, 79],
  [243, 198, 119]
];

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
    // get all visible tiles we have in cache
    const availableTiles: RenderTile[] = [];

    for (const tileId of this.visibleTileIds) {
      const url = this.getUrlForTileId(tileId);
      const renderTile = this.cache.get(url);

      // only add render tiles we have in cache and have data loaded
      if (renderTile && renderTile.data) {
        // update the zIndex to the current set value in the layer props
        renderTile.zIndex = this.props.zIndex;

        availableTiles.push(renderTile);

        this.lastRenderTiles.set(tileId, renderTile);
      }

      // FIXME: this else part is just a test for now to see the tiles animate when
      //  switching timesteps
      else {
        // if we don't have the loaded tile in cache, but we have an older rendered tile for
        // this tileId
        const lastRenderTile = this.lastRenderTiles.get(tileId);

        if (lastRenderTile) {
          availableTiles.push(lastRenderTile);
        }
      }
    }

    return availableTiles;
  }

  /**
   * Updates the request scheduler queue. For every new tile not already in the cache a request will
   * be scheduled.
   */
  private updateQueue() {
    this.visibleTileIds.forEach(async tileId => {
      // url will be the cache key because it defines the loaded ressource and includes all
      // relevant url paramters
      const url = this.getUrlForTileId(tileId);

      // load the tile from cache or create it
      let renderTile = this.cache.get(url);
      if (!renderTile) {
        renderTile = {
          tileId,
          url,
          zIndex: -1, // zIndex will be set when render tile is returned because it can change over time
          loadingState: TileLoadingState.QUEUED
        };

        this.cache.set(url, renderTile);
      }

      // return unless the tile is still queued and not currently being fetche
      if (renderTile.loadingState !== TileLoadingState.QUEUED) return;
      if (this.scheduler.isScheduled(renderTile)) return;

      // now we know it's a new, unique request, wait for a place in the queue
      const request = await this.scheduler.scheduleRequest(renderTile, this.getTilePriority);

      if (!request) return;

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
   * @param done
   */
  private async fetch(renderTile: RenderTile, done: () => void) {
    const {url} = renderTile;

    renderTile.loadingState = TileLoadingState.LOADING;

    if (this.props.debug && this.props.debugMode !== LayerDebugMode.OVERLAY) {
      renderTile.data = await this.renderDebugInfo(renderTile);
      renderTile.loadingState = TileLoadingState.LOADED;
      done();

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
      renderTile.data = await this.renderDebugInfo(renderTile);
    }

    done();
  }

  private async renderDebugInfo(renderTile: RenderTile): Promise<ImageBitmap> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = canvas.height = 256;

    if (renderTile.data) {
      // draw the image flipped
      ctx.save();
      ctx.scale(1, -1);
      ctx.drawImage(renderTile.data, 0, -256);
      ctx.restore();
    }

    let color = DEBUG_COLORS[Math.min(renderTile.tileId.zoom, DEBUG_COLORS.length - 1)];

    if (renderTile.loadingState === TileLoadingState.ERROR) {
      color = [255, 0, 0];
    }

    // only fill the debug-tile if there's no image-data
    if (!renderTile.data) {
      ctx.fillStyle = `rgb(${color.join(',')}, 0.6)`;
      ctx.fillRect(0, 0, 256, 256);
    }

    ctx.strokeStyle = `rgb(${color.join(',')}, 0.9)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 256, 256);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    ctx.font = '48px monospace';
    ctx.fillText(`(${renderTile.tileId.x} | ${renderTile.tileId.y})`, 128, 128, 256);

    ctx.font = '24px monospace';
    ctx.fillText(`zoom: ${renderTile.tileId.zoom}`, 128, 168, 256);

    if (renderTile.loadingState === TileLoadingState.ERROR) {
      ctx.fillStyle = 'red';
      ctx.fillText('LOADING FAILED', 128, 78, 256);
    }

    return await createImageBitmap(canvas, {imageOrientation: 'flipY'});
  }
}
