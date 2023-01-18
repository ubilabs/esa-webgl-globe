import '../style.css';
import {Renderer} from '../../src/main';
import {Marker} from '../../src/main';
import {getDebugTexture} from '../../src/renderer/lib/debug-texture';
import {TileId} from '../../src/tile-id';
import {getMarkerImage} from './marker-image';
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

  console.log(renderer.camera);
  console.log(renderer);

  for (let i = 0; i < 20; i++) {
    const img = await getMarkerImage(`Test ${i}`);
    const marker = new Marker({
      image: img,
      renderer,
      lngLat: [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180],
      anchor: [0, 0.5],
      scale: 0.8
    });
  }
})();
