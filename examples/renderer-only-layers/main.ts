import '../style.css';
import {Renderer} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileData} from '../../src/renderer/types/tile';

const zoom = 2;
const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

const COLOR_MAP = {
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
      x: column,
      y: row,
      z: zoom,
      url: 'debug',
      order: 0
    } as TileData;

    return [
      {...tileData, order: 0, url: 'debug/0'},
      {...tileData, order: 1, url: 'debug/1'},
      {...tileData, order: 2, url: 'debug/2'}
    ];
  });

  for (const tile of tiles) {
    const textureOptions = {
      rectColor: COLOR_MAP[tile.order],
      rectSize: (3 - tile.order) * 56,
      backgroundColor: tile.order === 0 ? 'white' : 'transparent'
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
