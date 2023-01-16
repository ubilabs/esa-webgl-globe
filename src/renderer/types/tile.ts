import type {TileId} from '../../tile-id';

export interface TileProps {
  tileId: TileId;
  order: number;
  url: string;
  scene: THREE.Scene;
  texture: THREE.Texture;
}

export interface TileData {
  tileId: TileId;
  url: string;
  order: number;
  data?: ImageBitmap;
}
