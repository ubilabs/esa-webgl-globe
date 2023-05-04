import '../style.css';
import {Vector2} from 'three';
import {Renderer, TileSelector} from '../../src/main';
import type {RenderTile} from '../../src/renderer/types/tile';

const renderer = new Renderer();
const selector = new TileSelector({
  debug: false,
  useOffscreenCanvas: true,
  useWorker: true
});

selector.setCamera(renderer.getCamera());
selector.setSize(new Vector2(window.innerWidth, window.innerHeight).multiplyScalar(0.25).round());

async function animate() {
  const tileIds = [...(await selector.getVisibleTiles())];
  const newTiles = tileIds.map(
    tileId =>
      ({
        tileId,
        url: `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/colored/${tileId.zoom}/${tileId.x}/${tileId.y}.png`,
        zIndex: 0
      } as RenderTile)
  );

  await Promise.all(
    newTiles.map(async tile => {
      const uniqTileId = `${tile.tileId.id}-${tile.url}`;
      const cachedData = getCache(uniqTileId);

      try {
        tile.data = cachedData || (await fetchImage(tile.url));

        if (!cachedData) {
          setCache(uniqTileId, tile.data!);
        }
      } catch (err: unknown) {}
    })
  );

  renderer.updateTiles(newTiles);
  requestAnimationFrame(animate);
}
animate();

async function fetchImage(url: string) {
  const blob = await fetch(url).then(res => res.blob());
  return createImageBitmap(blob, {imageOrientation: 'flipY'});
}

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
