import {RenderTile, TileLoadingState} from '../../renderer/types/tile';

const DEBUG_COLORS = [
  [12, 10, 62],
  [123, 30, 122],
  [179, 63, 98],
  [249, 86, 79],
  [243, 198, 119]
];

export async function renderDebugInfo(renderTile: RenderTile): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = canvas.height = 256;

  if (renderTile.data) {
    // draw the image flipped
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(renderTile.data, 0, -256);
    ctx.restore();
  }

  let color = DEBUG_COLORS[Math.min(renderTile.tileId.zoom, DEBUG_COLORS.length - 1)];

  if (renderTile.loadingState === TileLoadingState.ERROR) {
    color = [255, 0, 0];
  }

  // only fill the debug-tile if there's no image-data
  if (!renderTile.data) {
    ctx.fillStyle = `rgb(${color.join(',')}, 0.6)`;
    ctx.fillRect(0, 0, 256, 256);
  }

  ctx.strokeStyle = `rgb(${color.join(',')}, 0.9)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';

  ctx.font = '48px monospace';
  ctx.fillText(`(${renderTile.tileId.x} | ${renderTile.tileId.y})`, 128, 128, 256);

  ctx.font = '24px monospace';
  ctx.fillText(`zoom: ${renderTile.tileId.zoom}`, 128, 168, 256);

  if (renderTile.loadingState === TileLoadingState.ERROR) {
    ctx.fillStyle = 'red';
    ctx.fillText('LOADING FAILED', 128, 78, 256);
  }

  return await createImageBitmap(canvas, {imageOrientation: 'flipY'});
}
