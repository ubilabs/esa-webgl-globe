import RequestScheduler from './loader/request-sheduler';
import {Layer} from './loader/layer';
import {RenderTile} from './renderer/types/tile';
import {TileSelector} from './tile-selector/tile-selector';
import {Vector2} from 'three';
import {Renderer} from './renderer/renderer';
import {MarkerHtml} from './main';

import type {LngLatDist} from './renderer/types/lng-lat-dist';
import type {LayerProps} from './loader/types/layer';
import type {MarkerProps} from './renderer/types/marker';

const TILESELECTOR_FPS = 10;

type WebGlGlobeOptions = Partial<{
  layers: LayerProps<any>[];
  cameraView: LngLatDist;
  markers: MarkerProps[];
}>;

export class WebGlGlobe extends EventTarget {
  private layersById: Record<string, Layer> = {};
  private markersById: Record<string, MarkerHtml> = {};
  private readonly scheduler: RequestScheduler<RenderTile>;
  private readonly renderer: Renderer;
  private readonly tileSelector: TileSelector;
  private tileSelectorIntervalId: number = 0;
  private tileUpdateRafId: number = 0;

  constructor(container: HTMLElement, props: WebGlGlobeOptions = {}) {
    super();

    this.scheduler = new RequestScheduler();

    this.renderer = new Renderer({container});

    this.setProps(props);

    this.tileSelector = new TileSelector({
      debug: false,
      useOffscreenCanvas: true,
      useWorker: true
    });
    this.tileSelector.setCamera(this.renderer.camera);
    const {width, height} = container.getBoundingClientRect();
    this.tileSelector.setSize(new Vector2(width, height).multiplyScalar(0.25).round());

    this.attachEventListeners();
    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  setProps(props: WebGlGlobeOptions) {
    if (props.layers) {
      this.setLayers(props.layers);
    }

    if (props.cameraView) {
      this.renderer.setCameraView(props.cameraView);
    }

    if (props.markers) {
      this.setMarkers(props.markers);
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
      this.layersById[layer.id] = new Layer(this.scheduler, layer);
    }
  }

  private setMarkers(markerProps: MarkerProps[]) {
    // remove markers that are no longer needeed
    const newMarkerIds = markerProps.map(m => m.id);
    const toRemove = Object.keys(this.markersById).filter(id => !newMarkerIds.includes(id));

    for (const markerId of toRemove) {
      this.markersById[markerId].destroy();
    }

    for (let props of markerProps) {
      // known markers get updated
      const knownMarker = this.markersById[props.id];

      if (knownMarker) {
        knownMarker.setProps(props);
        continue;
      }

      // otherwise create the marker
      this.markersById[props.id] = new MarkerHtml({props, camera: this.renderer.camera});
    }
  }

  private startTileSelectorLoop() {
    this.tileSelectorIntervalId = setInterval(async () => {
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
      tiles.push(...layer.getRenderTiles());
    }

    this.renderer.updateTiles(tiles);
  }

  private attachEventListeners() {
    this.renderer.addEventListener('cameraViewChanged', (event: CustomEventInit<LngLatDist>) => {
      // create a new event since we cannot dispatch the same event twice
      const newEvent = new CustomEvent<LngLatDist>('cameraViewChanged', {detail: event.detail});
      this.dispatchEvent(newEvent);
    });
  }
}
