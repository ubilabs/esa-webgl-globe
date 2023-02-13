import '../style.css';
import {Vector2} from 'three';
import {Layer, Renderer, TileSelector} from '../../src/main';
import type {RenderTile} from '../../src/renderer/types/tile';
import RequestScheduler from '../../src/loader/request-sheduler';

const renderer = new Renderer();

const scheduler = new RequestScheduler<RenderTile>({
  throttleRequests: false,
  maxRequests: 6
});

const selector = new TileSelector({
  debug: false,
  useOffscreenCanvas: true,
  useWorker: true
});
selector.setCamera(renderer.camera);
selector.setSize(new Vector2(window.innerWidth, window.innerHeight).multiplyScalar(0.25).round());

const layer0 = new Layer<{timestep: number}>(scheduler, {
  urlParameters: {timestep: 0},
  zIndex: 0,
  maxZoom: 4,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/land/${zoom}/${x}/${y}.png`
  // `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/biomass.agb/tiles/${timestep}/${zoom}/${x}/${y}.png`
});

const layer1 = new Layer<{timestep: number}>(scheduler, {
  urlParameters: {timestep: 0},
  zIndex: 1,
  maxZoom: 7,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/biomass.agb/tiles/${timestep}/${zoom}/${x}/${y}.png`
});

async function animate() {
  // selector
  const tileIds = await selector.getVisibleTiles();

  // layer
  layer0.setVisibleTileIds(tileIds);
  layer1.setVisibleTileIds(tileIds);
  const renderTiles = layer0.getRenderTiles().concat(layer1.getRenderTiles());

  // renderer
  renderer.updateTiles(renderTiles);
  requestAnimationFrame(animate);
}
animate();
