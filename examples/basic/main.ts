import {Vector2} from 'three';
import {Renderer, TileSelector} from '../../src/main';

const renderer = new Renderer();
const selector = new TileSelector({
  debug: false,
  useOffscreenCanvas: true,
  useWorker: true
});

selector.setCamera(renderer.camera);
selector.setSize(new Vector2(window.innerWidth, window.innerHeight).multiplyScalar(0.25).round());

async function animate() {
  const tiles = await selector.getVisibleTiles();
  const newTiles = tiles.map(tile => ({...tile, url: 'debug/1'}));
  renderer.updateTiles(newTiles);
  requestAnimationFrame(animate);
}
animate();
