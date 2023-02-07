import '../style.css';
import {MarkerWebGl, MarkerHtml, Renderer} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import {getMarkerHTML, getMarkerImage} from './marker-image';
import type {TileData} from '../../src/renderer/types/tile';

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
      order: 0
    } as TileData;
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
  console.log({tiles});

  // @ts-ignore

  for (let i = 0; i < 5; i++) {
    const img = await getMarkerImage(`Webgl ${i}`);

    new MarkerWebGl({
      image: img,
      renderer,
      lngLat: [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180],
      anchor: [1, -1], // 0 is center, -1 is left/bottom, 1 is right/top
      offset: [-16, -16] // x/y offset in screen pixel
    });
  }

  for (let i = 0; i < 5; i++) {
    const markerString = await getMarkerHTML(`HTML ${i}`);
    new MarkerHtml({
      html: markerString,
      renderer: renderer,
      offset: [-16, -16],
      lngLat: [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180]
    });

    console.log([(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180]);
  }
})();
