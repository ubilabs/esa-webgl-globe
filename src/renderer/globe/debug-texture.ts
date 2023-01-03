import {CanvasTexture} from 'three';
import {TileDefinition} from './globe';

export function getDebugTexture(tile: TileDefinition) {
  const ctx = createTexture(tile);
  return new CanvasTexture(ctx.canvas);
}

function createTexture(tile: TileDefinition) {
  const timestamp = tile.url.split('/')[1];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(4, 4, ctx.canvas.width - 2 * 4, ctx.canvas.height - 2 * 4);
  ctx.fillStyle = 'red';
  ctx.fillRect(100, 100, 28 * 2, 28 * 2);
  ctx.fillStyle = 'black';
  ctx.font = '48px sans-serif';
  ctx.fillText(`z${tile.zoom} - x${tile.x} - y${tile.y}`, 10, 50);
  ctx.font = '48px sans-serif';
  ctx.fillText(`t${timestamp}`, 10, 90);

  return ctx;
}
