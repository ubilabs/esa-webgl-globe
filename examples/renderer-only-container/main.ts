import '../style.css';
import {Renderer} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import type {TileData} from '../../src/renderer/types/tile';

const zoom = 2;
const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

async function getTiles() {
  const tiles = Array.from({length: tileCount}).map((_, i) => {
    const row = Math.floor(i / columns);
    const column = i % columns;

    return {
      tileId: TileId.fromXYZ(column, row, zoom),
      url: 'debug/1',
      order: 0
    } as TileData;
  });

  for (const tile of tiles) {
    tile.data = await getDebugTexture(tile);
  }

  return tiles;
}

(async function () {
  const container = document.getElementById('container')!;
  const tiles = await getTiles();
  const renderer = new Renderer({container});
  renderer.updateTiles(tiles);
  console.log({tiles});
})();
