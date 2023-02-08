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

const layer = new Layer<{timestep: number}>(scheduler, {
  urlParameters: {timestep: 0},
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/biomass.agb/tiles/${timestep}/${zoom}/${x}/${y}.png`,
  zIndex: 0
});

setTimeout(() => {
  console.log('setProps');
  layer.setProps({urlParameters: {timestep: 1}});
}, 5000);

async function animate() {
  const tileIds = [...(await selector.getVisibleTiles())];
  layer.setVisibleTileIds(tileIds);

  const renderTiles = layer.getRenderTiles();
  renderer.updateTiles(renderTiles);

  requestAnimationFrame(animate);
}
animate();
