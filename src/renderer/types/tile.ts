export interface TileProps {
  x: number;
  y: number;
  z: number;
  order: number;
  scene: THREE.Scene;
  texture: THREE.Texture;
}

export interface TileData {
  x: number;
  y: number;
  z: number;
  url: string;
  order: number;
  data?: ImageBitmap;
}
