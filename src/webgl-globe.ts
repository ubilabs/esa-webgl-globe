import RequestScheduler from './loader/request-sheduler';
import {Layer, LayerProps} from './loader/layer';
import {RenderTile} from './renderer/types/tile';
import {TileSelector} from './tile-selector/tile-selector';
import {Vector2} from 'three';
import {Renderer} from './renderer/renderer';

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
    const newLayerIds = layers.map(l => l.id);
    const toRemove = Object.keys(this.layersById).filter(id => !newLayerIds.includes(id));

    for (const layerId of toRemove) {
      delete this.layersById[layerId];
    }

    for (let props of layers) {
      let layer = this.layersById[props.id];

      if (layer) {
        layer.setProps(props);
      } else {
        layer = new Layer(this.scheduler, props);
        this.layersById[props.id] = layer;
      }
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
