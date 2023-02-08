// 1x1 px sized ImageBitmap to use as a fallback for failed requests
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const emptyImageBitmap = createImageBitmap(canvas);

export function getEmptyImageBitmap() {
  return emptyImageBitmap;
}
