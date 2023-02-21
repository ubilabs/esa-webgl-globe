import '../style.css';
import {Renderer} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import type {RenderTile} from '../../src/renderer/types/tile';

const zoom = 2;
const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

async function getTiles(url: string, color: string, size: number) {
  const tiles = Array.from({length: tileCount}).map((_, i) => {
    const row = Math.floor(i / columns);
    const column = i % columns;

    return {
      tileId: TileId.fromXYZ(column, row, zoom),
      url,
      zIndex: 0
    } as RenderTile;
  });

  for (const tile of tiles) {
    tile.data = await getDebugTexture(tile, {rectColor: color, rectSize: size});
  }

  return tiles;
}

(async function () {
  const tilesA = await getTiles('debug/1', 'turquoise', 200);
  const tilesB = await getTiles('debug/2', 'deeppink', 200);

  const renderer = new Renderer();
  renderer.updateTiles(tilesA);
  let isA = true;

  setInterval(() => {
    renderer.updateTiles(isA ? tilesB : tilesA);
    isA = !isA;
  }, 3000);
})();
