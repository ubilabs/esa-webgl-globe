import RequestScheduler from './loader/request-sheduler';
import {Layer} from './loader/layer';
import {RenderTile} from './renderer/types/tile';
import {TileSelector} from './tile-selector/tile-selector';
import {Vector2} from 'three';
import {Renderer} from './renderer/renderer';
import type {LayerProps} from './loader/types/layer';

const TILESELECTOR_FPS = 10;

type WebGlGlobeOptions = Partial<{
  layers: LayerProps<any>[];
}>;

export class WebGlGlobe {
  private layersById: {[id: string]: Layer} = {};
  private readonly scheduler: RequestScheduler<RenderTile>;
  private readonly renderer: Renderer;
  private readonly tileSelector: TileSelector;
  private tileSelectorIntervalId: number = 0;
  private tileUpdateRafId: number = 0;

  constructor(container: HTMLElement, props: WebGlGlobeOptions = {}) {
    this.scheduler = new RequestScheduler();

    this.setProps(props);

    this.renderer = new Renderer({container});
    this.tileSelector = new TileSelector({
      debug: false,
      useOffscreenCanvas: true,
      useWorker: true
    });
    this.tileSelector.setCamera(this.renderer.camera);
    this.tileSelector.setSize(
      new Vector2(window.innerWidth, window.innerHeight).multiplyScalar(0.25).round()
    );

    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  setProps(props: WebGlGlobeOptions) {
    if (props.layers) {
      this.setLayers(props.layers);
    }
  }

  setLayers(layers: LayerProps[]) {
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

  start() {
    this.startTileSelectorLoop();
    this.startTileUpdateLoop();
  }

  stop() {
    clearInterval(this.tileSelectorIntervalId);
    cancelAnimationFrame(this.tileUpdateRafId);
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
}
