import '../style.css';
import {Renderer} from '../../src/main';
import {TileId} from '../../src/tile-id';
import type {RenderTile} from '../../src/renderer/types/tile';

const zoom = 1;
const columns = Math.pow(2, zoom + 1);
const rows = Math.pow(2, zoom);
const tileCount = columns * rows;

async function getTiles() {
  const tiles = Array.from({length: tileCount}).map((_, i) => {
    const row = Math.floor(i / columns);
    const column = i % columns;

    return {
      tileId: TileId.fromXYZ(column, row, zoom),
      url: 'https://storage.googleapis.com/esa-cfs-tiles/1.9.0/sst.analysed_sst/tiles/423/full.png',
      zIndex: 0,
      type: 'image'
    } as RenderTile;
  });

  for (const tile of tiles) {
    tile.data = await fetchImage(tile.url);
  }

  return tiles;
}

async function fetchImage(url: string) {
  const blob = await fetch(url).then(res => res.blob());
  return createImageBitmap(blob, {imageOrientation: 'flipY'});
}

(async function () {
  const tiles = await getTiles();
  const renderer = new Renderer();
  renderer.updateTiles(tiles);
  console.log({tiles});
})();
