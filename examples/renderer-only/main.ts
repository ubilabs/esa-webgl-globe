import {Renderer} from '../../src/main';

const zoom = 2;

const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

export function getTiles() {
  return Array.from({length: tileCount}).map((_, i) => {
    const columns = Math.pow(2, zoom + 1);
    const row = Math.floor(i / columns);
    const column = i % columns;

    return {
      zoom,
      x: column,
      y: row,
      url: 'debug/1'
    };
  });
}

const tiles = getTiles();

const renderer = new Renderer();
await renderer.updateTiles(tiles);

console.log({tiles});
