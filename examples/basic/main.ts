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
  const tileIds = await selector.getVisibleTiles();

  const renderTiles = [];
  for (let tileId of tileIds) {
    const {x, y, zoom} = tileId;
    renderTiles.push({x, y, zoom, url: 'debug/1'});
  }

  await renderer.updateTiles(renderTiles);
  requestAnimationFrame(animate);
}

animate();
