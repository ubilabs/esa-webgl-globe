import '../style.css';
import {Renderer} from '../../src';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import type {RenderTile} from '../../src/renderer/types/tile';

const zoom = 2;
const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

const COLOR_MAP: Record<number, string> = {
  0: 'red',
  1: 'green',
  2: 'blue'
};

async function getTiles() {
  const tiles = Array.from({length: tileCount}).flatMap((_, i) => {
    const columns = Math.pow(2, zoom + 1);
    const row = Math.floor(i / columns);
    const column = i % columns;

    const tileData = {
      tileId: TileId.fromXYZ(column, row, zoom),
      url: 'debug',
      zIndex: 0
    } as RenderTile;

    return [
      {...tileData, zIndex: 0, url: 'debug/0'},
      {...tileData, zIndex: 1, url: 'debug/1'},
      {...tileData, zIndex: 2, url: 'debug/2'}
    ];
  });

  for (const tile of tiles) {
    const textureOptions = {
      rectColor: COLOR_MAP[tile.zIndex],
      rectSize: (3 - tile.zIndex) * 56,
      backgroundColor: 'transparent'
    };

    tile.data = await getDebugTexture(tile, textureOptions);
  }

  return tiles;
}

(async function () {
  const tiles = await getTiles();
  const renderer = new Renderer();
  renderer.updateTiles(tiles);
  console.log({tiles});
})();
