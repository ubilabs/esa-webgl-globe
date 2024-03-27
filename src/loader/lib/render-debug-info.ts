import {RenderTile, TileLoadingState} from '../../renderer/types/tile';

const DEBUG_COLORS = [
  [39, 105, 176],
  [101, 87, 238],
  [156, 68, 240],
  [196, 43, 239],
  [220, 39, 222],
  [244, 36, 204],
  [250, 75, 174],
  [252, 105, 142],
  [254, 128, 106],
  [255, 149, 0]
];

export async function renderDebugInfo(renderTile: RenderTile): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = renderTile.data?.width ?? 256;
  canvas.height = renderTile.data?.height ?? 256;

  const {data, tileId, urlParameters} = renderTile;

  if (data) {
    // draw the image flipped
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(data, 0, 0, canvas.width, -canvas.height);
    ctx.restore();
  }

  let color = DEBUG_COLORS[Math.min(tileId.zoom, DEBUG_COLORS.length - 1)];
  if (renderTile.loadingState === TileLoadingState.ERROR) {
    color = [255, 0, 0];
  }

  // only fill the debug-tile if there's no image-data
  if (!renderTile.data) {
    ctx.fillStyle = `rgb(${color.join(',')}, 0.6)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // calculate left (x0), right (x1), top (y0), bottom (y1)
  let x0, x1, y0, y1;
  x0 = y0 = 0;
  x1 = y1 = 256;

  if (renderTile.type === 'image') {
    const {x, y, zoom} = renderTile.tileId;
    const columns = Math.pow(2, zoom + 1);
    const rows = Math.pow(2, zoom);
    x0 = (x / columns) * canvas.width;
    x1 = ((x + 1) / columns) * canvas.width;
    // invert y
    y0 = (1 - y / rows) * canvas.height;
    y1 = (1 - (y + 1) / rows) * canvas.height;
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const xCenter = dx / 2 + x0;
  const yCenter = dy / 2 + y0;

  ctx.strokeStyle = `rgb(${color.join(',')}, 0.9)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, dx, dy);

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';

  ctx.font = '48px monospace';
  ctx.fillText(`(${tileId.x} | ${tileId.y})`, xCenter, yCenter, dx / 2);

  ctx.font = '24px monospace';
  ctx.fillText(`zoom: ${tileId.zoom}`, xCenter, yCenter + 40, dx / 2);

  if (Object.keys(urlParameters).length > 0) {
    const paramsString =
      '(' +
      Object.entries(urlParameters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ') +
      ')';

    ctx.font = '16px monospace';
    ctx.fillText(paramsString, xCenter, yCenter + 70, dx / 2);
  }

  if (renderTile.type === 'image') {
    ctx.font = '80px monospace';
    ctx.globalAlpha = 0.2;
    ctx.fillText(
      'single-image'.split('').join('  '),
      canvas.width / 2,
      canvas.height / 2,
      canvas.width
    );
    ctx.globalAlpha = 1.0;
  }

  if (renderTile.loadingState === TileLoadingState.ERROR) {
    ctx.fillStyle = 'red';
    ctx.fillText('LOADING FAILED', xCenter, yCenter - 50, dx / 2);
  }

  return await createImageBitmap(canvas, {imageOrientation: 'flipY'});
}
