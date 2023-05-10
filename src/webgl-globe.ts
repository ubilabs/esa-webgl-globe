import {Vector2} from 'three';
import RequestScheduler from './loader/request-sheduler';
import {Layer} from './loader/layer';
import {RenderTile} from './renderer/types/tile';
import {TileSelector} from './tile-selector/tile-selector';
import {Renderer} from './renderer/renderer';
import {LayerLoadingState} from './loader/types/layer';

import type {LngLatDist} from './renderer/types/lng-lat-dist';
import type {LayerProps} from './loader/types/layer';
import type {MarkerProps} from './renderer/types/marker';
import {RenderMode} from './renderer/types/renderer';

const TILESELECTOR_FPS = 15;

export type WebGlGlobeProps = Partial<{
  layers: LayerProps<any>[];
  renderMode: RenderMode;
  cameraView: LngLatDist;
  markers: MarkerProps[];
  allowDownsampling: boolean;
}>;

const DEFAULT_PROPS = {allowDownsampling: true};

export class WebGlGlobe extends EventTarget {
  private layersById: Record<string, Layer> = {};
  /**
   * Stores the previously rendered tiles per layer, these tiles will continue to get rendered while
   * the layer is updating due to a change in parameters. A WeakMap is used here to avoid keeping
   * the tiles around when the layer has been removed.
   */
  private previousRenderTiles: WeakMap<Layer, RenderTile[]> = new WeakMap();

  private container: HTMLElement;
  private readonly scheduler: RequestScheduler<RenderTile>;
  private readonly renderer: Renderer;
  private readonly tileSelector: TileSelector;

  private tileSelectorIntervalId: number = 0;
  private tileUpdateRafId: number = 0;
  private props!: WebGlGlobeProps;

  private static tileSelectorWorkerUrl: string =
    new URL(import.meta.url).origin + '/tile-selector-worker.js';

  constructor(container: HTMLElement, props: WebGlGlobeProps = {}) {
    super();

    this.scheduler = new RequestScheduler();

    this.container = container;
    this.renderer = new Renderer({container});
    this.tileSelector = new TileSelector({
      workerUrl: WebGlGlobe.tileSelectorWorkerUrl
    });

    this.setProps({...DEFAULT_PROPS, ...props});

    this.resize();
    this.attachEventListeners();
    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  setProps(props: WebGlGlobeProps) {
    this.props = {...this.props, ...props};

    if (props.layers) {
      this.setLayers(props.layers);
    }

    if (props.cameraView) {
      this.renderer.setCameraView(props.cameraView);
    }

    if (props.markers) {
      this.setMarkers(props.markers);
    }

    if (props.renderMode) {
      this.renderer.setRenderMode(props.renderMode);
      this.tileSelector.setRenderMode(props.renderMode);
    }
  }

  start() {
    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  stop() {
    clearInterval(this.tileSelectorIntervalId);
    cancelAnimationFrame(this.tileUpdateRafId);
  }

  private setLayers(layers: LayerProps[]) {
    // remove layers that are no longer needeed
    const newLayerIds = layers.map(l => l.id);
    const toRemove = Object.keys(this.layersById).filter(id => !newLayerIds.includes(id));

    for (const layerId of toRemove) {
      // fixme: do we need a destructor here, to free caches or sth like that?
      delete this.layersById[layerId];
    }

    for (let layer of layers) {
      // known layers get updated
      if (this.layersById[layer.id]) {
        this.layersById[layer.id].setProps(layer);

        continue;
      }

      // otherwise create the layer
      this.layersById[layer.id] = new Layer(this.scheduler, layer, this);
    }
  }

  private setMarkers(markers: MarkerProps[]) {
    this.renderer.setMarkers(markers);
  }

  private startTileSelectorLoop() {
    this.tileSelectorIntervalId = window.setInterval(async () => {
      this.tileSelector.setCamera(this.renderer.getCamera());
      const visibleTiles = await this.tileSelector.getVisibleTiles();

      for (const layer of Object.values(this.layersById)) {
        layer.setVisibleTileIds(visibleTiles);
      }
    }, 1000 / TILESELECTOR_FPS);
  }

  private startTileUpdateLoop() {
    const loop = () => {
      this.tileUpdateRafId = requestAnimationFrame(loop);
      this.updateRenderTiles();
    };

    this.tileUpdateRafId = requestAnimationFrame(loop);
  }

  private updateRenderTiles() {
    const tiles = [];

    for (const layer of Object.values(this.layersById)) {
      if (layer.canRender(this.props.allowDownsampling)) {
        const renderTiles = layer.getRenderTiles();
        this.previousRenderTiles.set(layer, renderTiles);

        tiles.push(...renderTiles);
      } else if (this.previousRenderTiles.has(layer)) {
        tiles.push(...this.previousRenderTiles.get(layer)!);
      }
    }

    this.renderer.updateTiles(tiles);
  }

  private resize() {
    const {width, height} = this.container.getBoundingClientRect();

    // Resize tile selector size
    this.tileSelector.setSize(new Vector2(width, height).multiplyScalar(0.25).round());

    // Resize renderer size
    this.renderer.resize(width, height);
  }

  private attachEventListeners() {
    // Window Resize
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);

    // Dispatch camera view changed event
    this.renderer.addEventListener('cameraViewChanged', (event: CustomEventInit<LngLatDist>) => {
      // create a new event since we cannot dispatch the same event twice
      const newEvent = new CustomEvent<LngLatDist>('cameraViewChanged', {detail: event.detail});
      this.dispatchEvent(newEvent);
    });
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    this.renderer.destroy();
    void this.tileSelector.destroy();
  }

  static getTileSelectorWorkerUrl() {
    console.log(this.tileSelectorWorkerUrl);
    return this.tileSelectorWorkerUrl;
  }
  static setTileSelectorWorkerUrl(url: string) {
    this.tileSelectorWorkerUrl = url;
  }
}

export interface WebGlGlobeEventMap {
  cameraViewChanged: CustomEvent<LngLatDist>;
  layerLoadingStateChanged: CustomEvent<{layer: LayerProps; state: LayerLoadingState}>;
}

export interface WebGlGlobe {
  addEventListener<K extends keyof WebGlGlobeEventMap>(
    type: K,
    listener: (this: WebGlGlobe, ev: WebGlGlobeEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof WebGlGlobeEventMap>(
    type: K,
    listener: (this: WebGlGlobe, ev: WebGlGlobeEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}
