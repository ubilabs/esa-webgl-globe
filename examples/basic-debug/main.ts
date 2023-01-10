import '../style.css';
import {Vector2} from 'three';
import {Renderer, TileSelector} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import type {TileData} from '../../src/renderer/types/tile';

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
  const newTiles = tiles.map(
    tile =>
      ({
        x: tile.x,
        y: tile.y,
        z: tile.zoom,
        url: 'debug/1',
        order: 0
      } as TileData)
  );

  await Promise.all(
    newTiles.map(async tile => {
      const uniqTileId = `${tile.x}-${tile.y}-${tile.z}-${tile.url}`;
      const cachedData = getCache(uniqTileId);

      tile.data = cachedData || (await getDebugTexture(tile));

      if (!cachedData) {
        setCache(uniqTileId, tile.data!);
      }
    })
  );

  renderer.updateTiles(newTiles);
  requestAnimationFrame(animate);
}
animate();

// just for this example - can be deleted once the tile loader exists
const MAX_CACHE = 200;
const cacheMap = new Map();
const cacheList: string[] = [];

function setCache(key: string, data: ImageBitmap) {
  cacheMap.set(key, data);
  cacheList.push(key);
  if (cacheList.length > MAX_CACHE) {
    cacheMap.delete(cacheList.shift());
  }
}

function getCache(key: string) {
  return cacheMap.get(key);
}
