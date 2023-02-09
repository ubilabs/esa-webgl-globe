import '../style.css';
import {MarkerHtml, Renderer} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import {getMarkerHTML} from './marker-image';
import type {RenderTile} from '../../src/renderer/types/tile';

const zoom = 3;
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
      zIndex: 0
    } as RenderTile;
  });

  for (const tile of tiles) {
    const textureOptions = {
      rectColor: '#666',
      rectSize: 255,
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

  for (let i = 0; i < 100; i++) {
    const lngLat: [number, number] = [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180];
    const markerString = await getMarkerHTML(`${lngLat.map(x => x.toFixed(1)).join(', ')}`);

    new MarkerHtml({
      html: markerString,
      renderer: renderer,
      offset: [-16, -16],
      lngLat
    });
  }

  new MarkerHtml({
    html: await getMarkerHTML(`Sicilia`),
    renderer: renderer,
    offset: [-16, -16],
    lngLat: [14.111089, 37.585256]
  });
})();
