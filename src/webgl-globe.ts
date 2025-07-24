import {Vector2} from 'three';
import RequestScheduler from './loader/request-sheduler';
import {Layer} from './loader/layer';
import {RenderTile} from './renderer/types/tile';
import {TileSelector} from './tile-selector/tile-selector';
import {Renderer} from './renderer/renderer';
import {RenderMode, RenderOptions} from './renderer/types/renderer';
import {LayerLoadingState} from './loader/types/layer';

import type {CameraView} from './renderer/types/camera-view';
import type {LayerProps} from './loader/types/layer';
import type {MarkerProps} from './renderer/types/marker';

const TILESELECTOR_FPS = 15;

export type WebGlGlobeProps = Partial<{
  layers: LayerProps<any>[];
  renderMode: RenderMode;
  cameraView: Partial<CameraView>;
  markers: MarkerProps[];
  allowDownsampling: boolean;
  renderOptions: RenderOptions;
}>;

export type TextureUrls = {shading: string; atmosphere: string};

const DEFAULT_PROPS = {allowDownsampling: true};

export class WebGlGlobe extends EventTarget {
  private readonly resizeObserver: ResizeObserver;
  private readonly container: HTMLElement;
  private readonly scheduler: RequestScheduler<RenderTile>;
  private readonly renderer: Renderer;
  private readonly tileSelector: TileSelector;

  private layersById: Record<string, Layer> = {};

  /**
   * Stores the previously rendered tiles per layer, these tiles will continue to get rendered while
   * the layer is updating due to a change in parameters. A WeakMap is used here to avoid keeping
   * the tiles around when the layer has been removed.
   */
  private previousRenderTiles: WeakMap<Layer, RenderTile[]> = new WeakMap();

  private tileSelectorIntervalId: number = 0;
  private tileUpdateRafId: number = 0;
  private props!: WebGlGlobeProps;

  private static tileSelectorWorkerUrl: string =
    new URL(import.meta.url).origin + '/tile-selector-worker.js';

  private static textureUrls: TextureUrls = {
    atmosphere: new URL('/textures/atmosphere.png', import.meta.url).href,
    shading: new URL('/textures/shading.png', import.meta.url).href
  };

  constructor(container: HTMLElement, props: WebGlGlobeProps = {}) {
    super();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    this.scheduler = new RequestScheduler();

    this.container = container;
    this.renderer = new Renderer(container);
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
      this.renderer.setCameraView({
        renderMode: RenderMode.GLOBE,
        lat: 0,
        lng: 0,
        zoom: 0,
        altitude: 0,

        ...props.cameraView
      });
    }

    if (props.markers) {
      this.setMarkers(props.markers);
    }

    if (props.renderMode) {
      this.renderer.setRenderMode(props.renderMode);
      this.tileSelector.setRenderMode(props.renderMode);
    }

    if (props.renderOptions) this.renderer.setRenderOptions(props.renderOptions);
  }

  start() {
    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  stop() {
    clearInterval(this.tileSelectorIntervalId);
    cancelAnimationFrame(this.tileUpdateRafId);
  }

  private spinInteractionHandler: (() => void) | null = null;

  private spinRequestAnimationFrameId: number = 0;

  /**
   * Starts an automatic spinning of the globe.
   *
   * @param {number} [speed=0.1] - The speed of the spinning, where positive values spin clockwise.
   *   Default value is 0.1.
   *
   *   If the spin is already active, this method does nothing. The spinning updates the longitude of
   *   the camera view continuously. Default is `0.1`
   */
  public startAutoSpin(speed: number = 0.1) {
    if (this.spinRequestAnimationFrameId) {
      return;
    }

    this.spinInteractionHandler = () => this.stopAutoSpin();

    let rot = 180;

    const cameraView = this.renderer.getCameraView();
    const spin = () => {
      rot += speed;
      const lng = (rot % 360) - 180;
      console.log('Spinning to longitude:', lng);
      console.log('Camera view:', cameraView);
      this.setProps({cameraView: {...cameraView, lng}});
      this.spinRequestAnimationFrameId = requestAnimationFrame(spin);
    };
    this.spinRequestAnimationFrameId = requestAnimationFrame(spin);
    spin();
  }

  public stopAutoSpin() {
    if (!this.spinRequestAnimationFrameId) {
      return;
    }

    console.log('Stopping auto spin');
    cancelAnimationFrame(this.spinRequestAnimationFrameId);
    this.spinRequestAnimationFrameId = 0;

    if (this.spinInteractionHandler) {
      this.container.removeEventListener('mousedown', this.spinInteractionHandler);
      this.container.removeEventListener('wheel', this.spinInteractionHandler);
      this.container.removeEventListener('touchstart', this.spinInteractionHandler);
      this.spinInteractionHandler = null;
    }
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
    // Observe resize of our container
    this.resizeObserver.observe(this.container);

    // Dispatch camera view changed event
    this.renderer.addEventListener('cameraViewChanged', (event: CustomEventInit<CameraView>) => {
      // create a new event since we cannot dispatch the same event twice
      const newEvent = new CustomEvent<CameraView>('cameraViewChanged', {detail: event.detail});
      this.dispatchEvent(newEvent);
    });
  }

  destroy() {
    this.stopAutoSpin();
    this.resizeObserver.unobserve(this.container);
    this.renderer.destroy();
    void this.tileSelector.destroy();
  }

  static getTileSelectorWorkerUrl() {
    return this.tileSelectorWorkerUrl;
  }
  static setTileSelectorWorkerUrl(url: string) {
    this.tileSelectorWorkerUrl = url;
  }

  static getTextureUrls(): TextureUrls {
    return this.textureUrls;
  }

  static setTextureUrls(value: TextureUrls) {
    this.textureUrls = value;
  }
}

export interface WebGlGlobeEventMap {
  cameraViewChanged: CustomEvent<CameraView>;
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
