import type {TileData} from '../types/tile';

interface Options {
  rectColor: string;
  rectSize: number;
  backgroundColor: string;
}

export function getDebugTexture(tile: TileData, options?: Options): Promise<ImageBitmap> {
  const {rectColor = 'red', rectSize = 56, backgroundColor = 'white'} = options || {};
  const timestamp = tile.url.split('/')[1];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = 'gray';
  ctx.strokeRect(4, 4, ctx.canvas.width - 2 * 4, ctx.canvas.height - 2 * 4);
  ctx.fillStyle = rectColor;
  const rectX = (256 - rectSize) / 2;
  ctx.fillRect(rectX, rectX, rectSize, rectSize);
  ctx.fillStyle = 'black';
  ctx.font = '40px sans-serif';
  ctx.fillText(`z${tile.z}-x${tile.x}-y${tile.y}`, 10, 50);
  ctx.font = '40px sans-serif';
  ctx.fillText(`t${timestamp}`, 10, 90);

  return createImageBitmap(canvas, {imageOrientation: 'flipY'});
}
